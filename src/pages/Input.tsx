import { Top, Paragraph, Spacing } from '@toss/tds-mobile';
import { ScreenScaffold } from '@/components/ScreenScaffold';
import { Card } from '@/components/Card';
import { SubmitFooter } from '@/components/BottomCTA';
import { useTypedNavigate } from '@/hooks/useTypedNavigate';
import { todayKST, addDays, formatDate } from '@/lib/date';
import { getDayLog } from '@/lib/storage';

/**
 * /input — 어제 지출 기록.
 *
 * 라우팅 배선(Task 4.1)에서 만든 진입 가능한 골격이다. 카테고리 Chip·금액/메모
 * TextField·항목 목록은 Task 3.1/3.2가 이 파일에 채운다 — 파일을 새로 만들지 말고
 * 여기를 확장하라.
 */
export default function Input() {
  const nav = useTypedNavigate();
  const today = todayKST();
  const basisDate = addDays(today, -1);
  const log = getDayLog(basisDate);
  const hasLog = log.noSpend || log.entries.length > 0;

  return (
    <ScreenScaffold
      top={<Top title={<Top.TitleParagraph>어제 지출 기록</Top.TitleParagraph>} />}
      bottom={<SubmitFooter label="오늘의 운세 보기" onClick={() => nav('/result', { date: today })} />}
    >
      <Card testId="input-basis-card">
        <Paragraph.Text typography="st11">기록할 날짜</Paragraph.Text>
        <Spacing size={4} />
        <Paragraph.Text typography="t2">{formatDate(basisDate)}</Paragraph.Text>
        <Spacing size={8} />
        <Paragraph.Text typography="t6">
          {hasLog
            ? `기록 ${log.entries.length}건 · 합계 ${log.total.toLocaleString('ko-KR')}원`
            : '아직 기록이 없어요'}
        </Paragraph.Text>
      </Card>

      <Spacing size={16} />

      <Card testId="input-guide-card">
        <Paragraph.Text typography="t6">
          어제 쓴 돈을 카테고리별로 남기면 오늘의 소비운세가 열려요.
        </Paragraph.Text>
      </Card>
    </ScreenScaffold>
  );
}
