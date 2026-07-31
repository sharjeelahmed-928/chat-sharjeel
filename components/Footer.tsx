import Link from "next/link";
import Image from "next/image";
import {
  Mail,
  Phone,
  Github,
  Linkedin,
  Instagram,
  Youtube,
  Twitter,
  MessageCircle,
} from "lucide-react";
import { getPublicSettings } from "@/lib/admin/settings";

export default async function Footer() {
  const settings = await getPublicSettings();

  return (
    <footer className="mt-12 border-t border-border bg-surface">
      <div className="mx-auto max-w-7xl px-6 py-10">

        <div className="flex flex-col gap-10 md:flex-row md:justify-between">

          {/* Left */}

          <div className="space-y-4">

            {settings.logoUrl && (
              <Image
                src={settings.logoUrl}
                alt={settings.siteName}
                width={42}
                height={42}
                className="rounded-lg"
              />
            )}

            <div>
              <h3 className="text-lg font-semibold">
                {settings.siteName}
              </h3>

              <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                {settings.siteDescription}
              </p>
            </div>

          </div>

          {/* Right */}

          <div className="space-y-3">

            <h4 className="font-medium">
              Need help?
            </h4>

            {settings.contactEmail && (
              <a
                href={`mailto:${settings.contactEmail}`}
                className="flex items-center gap-2 text-sm hover:text-accent"
              >
                <Mail className="h-4 w-4" />
                {settings.contactEmail}
              </a>
            )}

            {settings.phone && (
              <a
                href={`tel:${settings.phone}`}
                className="flex items-center gap-2 text-sm hover:text-accent"
              >
                <Phone className="h-4 w-4" />
                {settings.phone}
              </a>
            )}
            {settings.address && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>📍</span>
                    <span>{settings.address}</span>
                </div>
                )}
            {settings.supportEmail && (
                <a
                    href={`mailto:${settings.supportEmail}`}
                    className="flex items-center gap-2 text-sm hover:text-accent"
                >
                    <Mail className="h-4 w-4" />
                    {settings.supportEmail}
                </a>
                )}

          </div>

        </div>

        <div className="mt-8 flex flex-wrap items-center gap-5">

          {settings.social.github && (
            <Link href={settings.social.github} target="_blank">
              <Github className="h-5 w-5 hover:text-accent" />
            </Link>
          )}

          {settings.social.linkedin && (
            <Link href={settings.social.linkedin} target="_blank">
              <Linkedin className="h-5 w-5 hover:text-accent" />
            </Link>
          )}

          {settings.social.instagram && (
            <Link href={settings.social.instagram} target="_blank">
              <Instagram className="h-5 w-5 hover:text-accent" />
            </Link>
          )}

          {settings.social.youtube && (
            <Link href={settings.social.youtube} target="_blank">
              <Youtube className="h-5 w-5 hover:text-accent" />
            </Link>
          )}

          {settings.social.twitter && (
            <Link href={settings.social.twitter} target="_blank">
              <Twitter className="h-5 w-5 hover:text-accent" />
            </Link>
          )}

          {settings.social.discord && (
            <Link href={settings.social.discord} target="_blank">
              <MessageCircle className="h-5 w-5 hover:text-accent" />
            </Link>
          )}

        </div>

        <div className="mt-8 border-t border-border pt-5 text-sm text-muted-foreground">

          <div className="flex flex-col gap-2 md:flex-row md:justify-between">

            <span>
              {settings.footerCopyright}
            </span>

            <span>
              {settings.footerText}
            </span>

          </div>

        </div>

      </div>
    </footer>
  );
}