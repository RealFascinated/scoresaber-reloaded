import {
  cloneOverlayLayout,
  createBlankOverlayLayout,
  getOverlayPreset,
} from "@ssr/common/overlay/overlay-presets";
import type { OverlayConnectionSettings } from "@ssr/common/schemas/overlay/overlay-connection-settings";
import {
  MAX_USER_OVERLAYS,
  type CreateUserOverlayBody,
  type OverlayContent,
  type UpdateUserOverlayBody,
  type UserOverlay,
  type UserOverlaySummary,
} from "@ssr/common/schemas/response/user/overlay";
import { UserOverlaysRepository, type UserOverlayRow } from "../../repositories/user-overlays.repository";
import { OverlayUpdateBroadcaster } from "../overlay/overlay-update-broadcaster";

export type OverlayOwner = { id: string; playerId?: string | null };

export type CreateOverlayResult = UserOverlay | "limit-reached" | "unknown-preset";

function toContent(row: UserOverlayRow): OverlayContent {
  return { revision: row.updatedAt.getTime(), settings: row.settings, layout: row.layout };
}

function toOverlay(row: UserOverlayRow): UserOverlay {
  return { id: row.id, name: row.name, ...toContent(row) };
}

export class UserOverlaysService {
  /**
   * Gets the overlays of a user, most recently changed first.
   *
   * @param userId the user to get the overlays of
   */
  public static async list(userId: string): Promise<UserOverlaySummary[]> {
    const rows = await UserOverlaysRepository.getSummaries(userId);
    return rows.map(row => ({ id: row.id, name: row.name, updatedAt: row.updatedAt.getTime() }));
  }

  /**
   * Gets an overlay of a user.
   *
   * @param userId the owner
   * @param id the id of the overlay
   */
  public static async get(userId: string, id: string): Promise<UserOverlay | undefined> {
    const row = await UserOverlaysRepository.findById(id);
    return row && row.userId === userId ? toOverlay(row) : undefined;
  }

  /**
   * Gets what is needed to render an overlay. Public: the id is the secret.
   *
   * @param id the id of the overlay
   */
  public static async getContent(id: string): Promise<OverlayContent | undefined> {
    const row = await UserOverlaysRepository.findById(id);
    return row ? toContent(row) : undefined;
  }

  /**
   * Creates an overlay, blank or from a preset.
   *
   * @param user the owner, with the player they play as (if any)
   * @param body the name and optional preset
   */
  public static async create(user: OverlayOwner, body: CreateUserOverlayBody): Promise<CreateOverlayResult> {
    let layout = createBlankOverlayLayout();
    if (body.presetId) {
      const preset = getOverlayPreset(body.presetId);
      if (!preset) {
        return "unknown-preset";
      }
      layout = cloneOverlayLayout(preset.layout);
    }

    const settings: OverlayConnectionSettings = {
      playerId: user.playerId ?? "",
      useRealTimeData: true,
      dataClient: "BeatSaberPlus",
    };
    const row = await UserOverlaysRepository.create(
      user.id,
      { name: body.name, settings, layout },
      MAX_USER_OVERLAYS
    );
    return row === "limit-reached" ? row : toOverlay(row);
  }

  /**
   * Updates an overlay and pushes the change to the streams watching it.
   *
   * @param userId the owner
   * @param id the id of the overlay
   * @param patch the fields to change
   */
  public static async update(
    userId: string,
    id: string,
    patch: UpdateUserOverlayBody
  ): Promise<UserOverlay | undefined> {
    const row = await UserOverlaysRepository.update(id, userId, patch);
    if (!row) {
      return undefined;
    }
    OverlayUpdateBroadcaster.publish(id, { type: "layout", content: toContent(row) });
    return toOverlay(row);
  }

  /**
   * Copies an overlay of a user.
   *
   * @param user the owner
   * @param id the id of the overlay to copy
   */
  public static async duplicate(
    user: { id: string },
    id: string
  ): Promise<UserOverlay | "limit-reached" | undefined> {
    const source = await UserOverlaysRepository.findById(id);
    if (!source || source.userId !== user.id) {
      return undefined;
    }
    const row = await UserOverlaysRepository.create(
      user.id,
      {
        name: `${source.name} copy`.slice(0, 64),
        settings: source.settings,
        layout: cloneOverlayLayout(source.layout),
      },
      MAX_USER_OVERLAYS
    );
    return row === "limit-reached" ? row : toOverlay(row);
  }

  /**
   * Deletes an overlay and closes the streams watching it.
   *
   * @param userId the owner
   * @param id the id of the overlay
   */
  public static async delete(userId: string, id: string): Promise<boolean> {
    const deleted = await UserOverlaysRepository.delete(id, userId);
    if (deleted) {
      OverlayUpdateBroadcaster.publish(id, { type: "deleted" });
    }
    return deleted;
  }
}
