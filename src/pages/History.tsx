import { useState } from 'react';
import { Top, Paragraph, Spacing, ListRow, Button, Badge, Asset } from '@toss/tds-mobile';
import { generateHapticFeedback } from '@apps-in-toss/web-framework';
import { ScreenScaffold } from '@/components/ScreenScaffold';
import { SummaryHero } from '@/components/SummaryHero';
import { Amount } from '@/components/Amount';
import { Card } from '@/components/Card';
import { Sparkline } from '@/components/Sparkline';
import { MiniBar } from '@/components/MiniBar';
import { EmptyState } from '@/components/StateView';
import { useTypedNavigate } from '@/hooks/useTypedNavigate';
import { todayKST, addDays, formatDate } from '@/lib/date';
import { getStats } from '@/lib/stats';
import { getFortune, listDayLogs } from '@/lib/storage';
import { TYPE_TABLE } from '@/lib/fortuneTable';
import { CATEGORY_LABEL } from '@/lib/types';
import type { CategoryId } from '@/lib/types';
import { formatNumber } from '@/lib/utils';

const LOOKBACK_DAYS = 7;
const LIST_RANGE_DAYS = 90;
const PAGE_SIZE = 20;

// SDK 호출은 WebView 밖(로컬 브라우저 등)에서 throw한다 — 조용히 무시하고 진행한다.
function safeHaptic(type: 'tickWeak' | 'success') {
  try {
    generateHapticFeedback({ type });
  } catch {
    // ignore
  }
}

/**
 * /history — 소비운세 히스토리.
 *
 * 저장된 일별 기록(DayLog)을 최신순으로 나열하고, 날짜가 같은 운세 기록이 있으면
 * 점수·유형을 함께 표시한다. 상단 요약(getStats 하루 평균)과 최근 7일 점수 추이
 * (Sparkline) · 카테고리 비중(MiniBar)은 보조 시각화다. 기록이 0건이면 시각화 없이
 * 빈 상태만 노출한다.
 */
export default function History() {
  const nav = useTypedNavigate();
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const today = todayKST();
  const dayLogs = listDayLogs(addDays(today, -(LIST_RANGE_DAYS - 1)), today)
    .slice()
    .reverse();

  if (dayLogs.length === 0) {
    return (
      <ScreenScaffold top={<Top title={<Top.TitleParagraph>소비운세 히스토리</Top.TitleParagraph>} />}>
        <EmptyState
          icon={
            <Asset.Image
              frameShape={{ width: 72, height: 72, radius: 20 }}
              src="/characters/zero_spender.png"
              alt="아직 기록이 없어요"
            />
          }
          title="아직 기록이 없어요"
          action={
            <Button variant="weak" display="block" onClick={() => nav('/input')}>
              지출 기록하러 가기
            </Button>
          }
          testId="history-empty"
        />
      </ScreenScaffold>
    );
  }

  const stats = getStats(today, LOOKBACK_DAYS);

  const recentScores: number[] = [];
  for (let i = LOOKBACK_DAYS - 1; i >= 0; i--) {
    const record = getFortune(addDays(today, -i));
    if (record) recentScores.push(record.score);
  }

  const categoryEntries = (Object.entries(stats.byCategory) as [CategoryId, number][])
    .filter(([, amount]) => amount > 0)
    .sort((a, b) => b[1] - a[1]);

  const visibleLogs = dayLogs.slice(0, visibleCount);
  const hasMore = dayLogs.length > visibleCount;

  const goToResult = (date: string) => {
    safeHaptic('tickWeak');
    nav('/result', { date });
  };

  return (
    <ScreenScaffold top={<Top title={<Top.TitleParagraph>소비운세 히스토리</Top.TitleParagraph>} />}>
      <SummaryHero
        testId="history-avg-hero"
        label="최근 7일 하루 평균"
        value={<Amount value={stats.dailyAvg} unit="원" typography="t1" />}
        caption={`기록 ${stats.loggedDays}일`}
      />

      {recentScores.length >= 2 ? (
        <>
          <Spacing size={16} />
          <Card>
            <Paragraph.Text typography="t5">운세 점수 추이</Paragraph.Text>
            <Spacing size={12} />
            <Sparkline data={recentScores} testId="history-sparkline" />
          </Card>
        </>
      ) : null}

      {categoryEntries.length > 0 ? (
        <>
          <Spacing size={16} />
          <Card>
            <Paragraph.Text typography="t5">카테고리 비중</Paragraph.Text>
            <Spacing size={12} />
            <div data-testid="category-minibar">
              {categoryEntries.map(([category, amount], i) => (
                <div key={category}>
                  {i > 0 ? <Spacing size={12} /> : null}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Paragraph.Text typography="t6">
                      {CATEGORY_LABEL[category]} {Math.round((amount / stats.total) * 100)}%
                    </Paragraph.Text>
                    <Amount value={amount} unit="원" typography="t6" />
                  </div>
                  <Spacing size={4} />
                  <MiniBar ratio={amount / stats.total} testId="history-category-bar" />
                </div>
              ))}
            </div>
          </Card>
        </>
      ) : null}

      <Spacing size={16} />

      <Card>
        {visibleLogs.map((log, index) => {
          const fortune = getFortune(log.date);
          return (
            <div
              key={log.date}
              data-testid="history-list-item"
              role="button"
              tabIndex={0}
              style={{ minHeight: 44 }}
              onClick={() => goToResult(log.date)}
            >
              {index > 0 ? <Spacing size={4} /> : null}
              <ListRow
                contents={
                  fortune ? (
                    <ListRow.Texts
                      type="3RowTypeA"
                      top={formatDate(log.date)}
                      middle={TYPE_TABLE[fortune.typeId].name}
                      bottom={`${formatNumber(log.total)}원`}
                    />
                  ) : (
                    <ListRow.Texts
                      type="2RowTypeA"
                      top={formatDate(log.date)}
                      bottom={`${formatNumber(log.total)}원`}
                    />
                  )
                }
                right={
                  fortune ? (
                    <Badge size="medium" variant="weak" color="blue">
                      {fortune.score}점
                    </Badge>
                  ) : undefined
                }
              />
            </div>
          );
        })}
      </Card>

      {hasMore ? (
        <>
          <Spacing size={12} />
          <Button
            variant="weak"
            display="block"
            onClick={() => setVisibleCount((c) => Math.min(c + PAGE_SIZE, dayLogs.length))}
          >
            더 보기
          </Button>
        </>
      ) : null}

      <Spacing size={16} />
    </ScreenScaffold>
  );
}
