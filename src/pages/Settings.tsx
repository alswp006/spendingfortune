import { useState } from 'react';
import { Top, ListRow, ConfirmDialog, Toast, Spacing } from '@toss/tds-mobile';
import { generateHapticFeedback } from '@apps-in-toss/web-framework';
import { ScreenScaffold } from '@/components/ScreenScaffold';
import { Card } from '@/components/Card';
import { useAppData } from '@/hooks/useAppData';
import { getStats } from '@/lib/stats';

const RECORD_LOOKBACK_DAYS = 90;

function fireHaptic() {
  try {
    Promise.resolve(generateHapticFeedback({ type: 'success' })).catch(() => {});
  } catch {
    /* WebView 밖에서는 throw — 무시 */
  }
}

export default function Settings() {
  const { todayDate, streak, resetAll } = useAppData();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const { loggedDays } = getStats(todayDate, RECORD_LOOKBACK_DAYS);

  const closeDialog = () => setDialogOpen(false);

  const confirmReset = async () => {
    setDialogOpen(false);
    try {
      fireHaptic();
      await resetAll();
      setToast('기록을 모두 지웠어요');
    } catch {
      setToast('기록을 지우지 못했어요');
    }
  };

  return (
    <ScreenScaffold top={<Top title={<Top.TitleParagraph>설정</Top.TitleParagraph>} />}>
      <Spacing size={16} />
      <Card testId="settings-info-card">
        <ListRow
          style={{ minHeight: 44, minWidth: 44 }}
          contents={
            <ListRow.Texts
              type="2RowTypeA"
              top="콘텐츠 안내"
              bottom="소비운세는 입력한 지출로 만든 재미용 콘텐츠예요"
            />
          }
        />
        <ListRow
          style={{ minHeight: 44, minWidth: 44 }}
          contents={
            <ListRow.Texts
              type="2RowTypeA"
              top="데이터 보관 안내"
              bottom="기기에만 저장돼서 앱을 지우면 복구할 수 없어요"
            />
          }
        />
        <ListRow
          style={{ minHeight: 44, minWidth: 44 }}
          contents={
            <ListRow.Texts
              type="2RowTypeA"
              top="기록 요약"
              bottom={`기록 ${loggedDays}일 · 연속 ${streak}일`}
            />
          }
        />
      </Card>

      <Spacing size={16} />

      <Card testId="settings-danger-card">
        <ListRow
          style={{ minHeight: 44, minWidth: 44 }}
          contents={<ListRow.Texts type="1RowTypeA" top="데이터 전체 삭제" />}
          onClick={() => setDialogOpen(true)}
          data-testid="reset-row"
        />
      </Card>

      <Spacing size={16} />

      <ConfirmDialog
        open={dialogOpen}
        title="기록을 모두 지울까요?"
        description="지운 기록은 되돌릴 수 없어요."
        cancelButton={<ConfirmDialog.CancelButton onClick={closeDialog}>닫기</ConfirmDialog.CancelButton>}
        confirmButton={<ConfirmDialog.ConfirmButton onClick={confirmReset}>삭제하기</ConfirmDialog.ConfirmButton>}
        onClose={closeDialog}
      />

      <Toast open={toast !== null} text={toast ?? ''} position="bottom" />
    </ScreenScaffold>
  );
}
