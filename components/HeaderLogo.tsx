import Image from "next/image";

export function HeaderLogo() {
  return (
    <Image
      src="/lms-logo.png"
      alt="Last Man Standing"
      width={64}
      height={64}
      priority
      className="h-14 w-14 shrink-0 rounded-full bg-white object-contain p-0.5 shadow-sm"
    />
  );
}
