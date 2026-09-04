import { Spacing } from '@toss/tds-mobile';
import { AdSlot } from '@/components/AdSlot';

export function AdSection() {
  const adGroupId = import.meta.env.VITE_TOSS_AD_GROUP_ID || '';

  if (!adGroupId) {
    return null;
  }

  return (
    <div data-testid="ad-section">
      <Spacing size={16} data-spacing="16" />
      <AdSlot adGroupId={adGroupId} />
      <Spacing size={16} data-spacing="16" />
    </div>
  );
}
