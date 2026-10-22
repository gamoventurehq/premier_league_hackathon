import type { Metadata } from 'next';

import { StudioProvider } from '../../components/studio/StudioProvider';
import { StudioShell } from '../../components/studio/StudioShell';

export const metadata: Metadata = {
  title: 'Studio | Premier League Studio: Synthetic Match Insights Engine',
  description:
    'The live studio for the Synthetic Match Insights Engine: Pitch Control, Pass Difficulty Rating (PDR), Control vs. Chaos Index, and the Broadcast Overlay, rendered in four personas and five broadcast languages.',
};

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return (
    <StudioProvider>
      <StudioShell>{children}</StudioShell>
    </StudioProvider>
  );
}
