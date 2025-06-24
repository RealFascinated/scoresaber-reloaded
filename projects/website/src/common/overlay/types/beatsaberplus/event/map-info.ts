export type BeatSaberPlus_MapInfoEvent = {
  mapInfoChanged: {
    BPM: number;
    BSRKey: string;
    PP: number;
    artist: string;
    characteristic: string;
    coverRaw: string;
    difficulty: string;
    duration: number;
    level_id: string;
    mapper: string;
    name: string;
    sub_name: string;
    time: number;
    timeMultiplier: number;
  };
};
