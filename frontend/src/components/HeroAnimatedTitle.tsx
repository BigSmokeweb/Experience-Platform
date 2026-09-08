'use client';

import { CornText } from './CornText';

export function HeroAnimatedTitle() {
  return (
    <CornText
      text="Journi"
      fontFamily="'Luxurious Script', var(--font-luxurious-script), cursive"
      fontSize="170px"
      fontWeight={400}
      letterSpacing="0.04em"
      textTransform="none"
      viewBoxWidth={1600}
      viewBoxHeight={280}
      forceFieldRadius={78}
      maxLetters={6}
    />
  );
}
export default HeroAnimatedTitle;
