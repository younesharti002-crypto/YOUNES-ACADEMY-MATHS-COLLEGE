export const academyLinks = {
  whatsapp: "https://wa.me/message/7QKYIB7HB6BSD1",
  facebook: "https://facebook.com/thesecretacademy.oulfa",
  instagram: "https://www.instagram.com/the_secret_academy1",
  tiktok: "https://www.tiktok.com/@thesecret_academy1",
  phone: "0644344034",
};

export const academySocialLinks = [
  { key: "whatsapp", label: "WhatsApp", shortLabel: "WA", href: academyLinks.whatsapp },
  { key: "facebook", label: "Facebook", shortLabel: "FB", href: academyLinks.facebook },
  { key: "instagram", label: "Instagram", shortLabel: "IG", href: academyLinks.instagram },
  { key: "tiktok", label: "TikTok", shortLabel: "TT", href: academyLinks.tiktok },
] as const;
