import { useState, useEffect } from 'react';
import { generateHapticFeedback } from '@apps-in-toss/web-framework';
import { getMeta, patchMeta } from '@/lib/storage';

interface ContentNotice {
  open: boolean;
  description: string;
  acknowledge: () => void;
}

export function useContentNotice(): ContentNotice {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const meta = getMeta();
    setOpen(meta.noticeAckedAt === null);
  }, []);

  const acknowledge = () => {
    try {
      generateHapticFeedback({ type: 'tickWeak' });
    } catch {
      // SDK unavailable
    }
    patchMeta({ noticeAckedAt: Date.now() });
    setOpen(false);
  };

  return {
    open,
    description: '이 서비스는 재미용 콘텐츠이며, 투자·금융 자문이 아니에요. 의사결정은 신중하게 하세요.',
    acknowledge,
  };
}
