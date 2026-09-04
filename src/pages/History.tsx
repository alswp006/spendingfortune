import { Top, Paragraph, Spacing, ListRow, Button } from '@toss/tds-mobile';
import { ScreenScaffold } from '@/components/ScreenScaffold';
import { SummaryHero } from '@/components/SummaryHero';
import { Sparkline } from '@/components/Sparkline';
import { EmptyState } from '@/components/StateView';
import { useTypedNavigate } from '@/hooks/useTypedNavigate';
import { todayKST, addDays, formatDate } from '@/lib/date';
import { getFortune } from '@/lib/storage';

const LOOKBACK_DAYS = 7;

/**
 * /history — 최근 7일 소비운세.
 *
 * 라우팅 배선(Task 4.1)의 골격. 카테고리 MiniBar·그래프 표시 스위치 연동은
 * Task 3.7/3.8이 이 파일에 채운다.
 */
export default function History() {
  const nav = useTypedNavigate();
  const today = todayKST();

  const records = Array.from({ length: LOOKBACK_DAYS }, (_, i) =>
    getFortune(addDays(today, -(LOOKBACK_DAYS - 1 - i))),
  ).flatMap((r) => (r ? [r] : []));

  if (records.length === 0) {
    return (
      <ScreenScaffold top={<Top title={<Top.TitleParagraph>7일 소비운세</Top.TitleParagraph>} />}>
        <EmptyState
          title="아직 쌓인 운세가 없어요"
          description="어제 지출을 기록하면 하루씩 채워져요"
          action={
            <Button variant="weak" display="block" onClick={() => nav('/input')}>
              어제 지출 기록하기
            </Button>
          }
          testId="history-empty"
        />
      </ScreenScaffold>
    );
  }

  const avg = Math.round(records.reduce((sum, r) => sum + r.score, 0) / records.length);

  return (
    <ScreenScaffold top={<Top title={<Top.TitleParagraph>7일 소비운세</Top.TitleParagraph>} />}>
      <SummaryHero
        label={`최근 ${records.length}일 평균`}
        value={<Paragraph.Text typography="t1">{avg}점</Paragraph.Text>}
        testId="history-avg-hero"
      />

      <Spacing size={16} />

      <Sparkline data={records.map((r) => r.score)} testId="history-sparkline" />

      <Spacing size={8} />

      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {records
          .slice()
          .reverse()
          .map((r) => (
            <ListRow
              key={r.date}
              contents={
                <ListRow.Texts type="2RowTypeA" top={formatDate(r.date)} bottom={`${r.score}점`} />
              }
              onClick={() => nav('/result', { date: r.date })}
            />
          ))}
      </ul>
    </ScreenScaffold>
  );
}
