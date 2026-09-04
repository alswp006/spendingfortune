import { useEffect, useState } from 'react';
import { Top, Paragraph, Spacing, Button, Toast, AlertDialog } from '@toss/tds-mobile';
import { useNavigate } from 'react-router-dom';
import { ScreenScaffold } from '@/components/ScreenScaffold';
import { SummaryHero } from '@/components/SummaryHero';
import { Amount } from '@/components/Amount';
import { EmptyState, LoadingState } from '@/components/StateView';
import { AdSection } from '@/components/AdSection';
import { useAppData } from '@/hooks/useAppData';
import { useContentNotice } from '@/hooks/useContentNotice';
import { STORAGE_KEYS } from '@/lib/types';

/**
 * sf.daylogs.v1이 파싱 불가능한 JSON이면 true를 반환한다. storage.ts의 자가 치유는
 * useAppData 내부에서 일어나 화면에 신호를 주지 않으므로, 손상 안내 토스트를 띄우기
 * 위해 Home이 직접 원본 문자열을 한 번 더 확인한다.
 */
function isDayLogsCorrupted(): boolean {
  const raw = localStorage.getItem(STORAGE_KEYS.dayLogs);
  if (!raw) return false;
  try {
    JSON.parse(raw);
    return false;
  } catch {
    return true;
  }
}

export default function Home() {
  const navigate = useNavigate();
  const { loading, streak, yesterdayLog } = useAppData();
  const [showCorruptToast, setShowCorruptToast] = useState(false);
  const { open: noticeOpen, description: noticeDescription, acknowledge: acknowledgeNotice } = useContentNotice();

  useEffect(() => {
    if (isDayLogsCorrupted()) {
      localStorage.setItem(STORAGE_KEYS.dayLogs, '{}');
      setShowCorruptToast(true);
    }
  }, []);

  const isEmptyYesterday = !yesterdayLog.noSpend && yesterdayLog.entries.length === 0;

  return (
    <ScreenScaffold top={<Top title={<Top.TitleParagraph>오늘의 소비운세</Top.TitleParagraph>} />}>
      {loading ? (
        <LoadingState rows={3} testId="home-skeleton" />
      ) : (
        <>
          <div data-testid="streak-badge">
            <Paragraph.Text typography="st11">연속 {streak}일째 기록 중</Paragraph.Text>
          </div>

          <Spacing size={12} />

          <SummaryHero
            testId="home-hero"
            label="어제 총 지출"
            value={
              <div data-testid="home-summary-hero">
                <Amount value={yesterdayLog.total} unit="원" typography="t1" />
              </div>
            }
            caption={yesterdayLog.noSpend ? '어제는 무지출이었어요' : `${yesterdayLog.entries.length}건 기록`}
            action={
              <Button variant="fill" display="block" data-testid="home-cta" onClick={() => navigate('/input')}>
                어제 지출 기록하기
              </Button>
            }
          />

          {isEmptyYesterday ? (
            <>
              <Spacing size={16} />
              <EmptyState
                title="첫 기록을 남기면 내일부터 소비운세가 열려요"
                testId="home-empty-state"
              />
            </>
          ) : null}

          <AdSection />
        </>
      )}

      <Toast open={showCorruptToast} text="기록을 불러오지 못해 초기화했어요" position="bottom" />

      <AlertDialog
        open={noticeOpen}
        title="안내"
        description={noticeDescription}
        onClose={acknowledgeNotice}
        alertButton={
          <AlertDialog.AlertButton onClick={acknowledgeNotice}>확인</AlertDialog.AlertButton>
        }
      />
    </ScreenScaffold>
  );
}
