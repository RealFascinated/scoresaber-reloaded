import AnnouncementBanner from "@/components/announcements/announcement-banner";
import SimpleLink from "@/components/simple-link";

/**
 * The announcements shown at the top of the website.
 * Each announcement has a unique id and stays closed forever once dismissed.
 */
export default function Announcements() {
  return (
    <AnnouncementBanner id="arona-discord-bot">
      Hello everyone! Please check out my Discord Bot -{" "}
      <SimpleLink
        className="text-discord-blue font-semibold transition-opacity hover:opacity-80"
        href="https://discord.com/oauth2/authorize?client_id=879163534871789619&scope=bot%20applications.commands&permissions=8"
        rel="noreferrer"
        target="_blank"
      >
        Arona
      </SimpleLink>
      {" :)"}
    </AnnouncementBanner>
  );
}
