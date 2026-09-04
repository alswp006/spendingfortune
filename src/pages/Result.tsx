import { Top, Paragraph, Spacing, Button } from '@toss/tds-mobile';
import { useLocation } from 'react-router-dom';
import { ScreenScaffold } from '@/components/ScreenScaffold';
import { Card } from '@/components/Card';
import { SummaryHero } from '@/components/SummaryHero';
import { EmptyState } from '@/components/StateView';
import { useTypedNavigate } from '@/hooks/useTypedNavigate';
import { todayKST, formatDate } from '@/lib/date';
import { getFortune } from '@/lib/storage';
import type { RouteState } from '@/lib/types';

/**
 * /result — 오늘의 소비운세.
 *
 * 라우팅 배선(Task 4.1)의 골격 + state 없는 직접 진입 방어. 리워드 광고 잠금 해제와
 * 상세 레이아웃은 Task 3.3~3.5가 이 파일에 채운다.
 *
 * ⚠️ state는 null 확인 우선 — 새로고침·딥링크 진입에서 location.state는 항상 null일 수 있다.
 */
export default function Result() {
  const nav = useTypedNavigate();
  const state = (useLocation().state as RouteState['/result']) ?? null;
  const date = state?.date ?? todayKST();
  const record = getFortune(date);

  return (
    <ScreenScaffold top={<Top title={<Top.TitleParagraph>오늘의 소비운세</Top.TitleParagraph>} />}>
      {record == null ? (
        <EmptyState
          title="아직 오늘의 운세가 없어요"
          description="어제 지출을 기록하면 오늘 운세가 열려요"
          action={
            <Button variant="weak" display="block" onClick={() => nav('/input')}>
              어제 지출 기록하기
            </Button>
          }
          testId="result-empty"
        />
      ) : (
        <>
          <SummaryHero
            label={formatDate(date)}
            value={<Paragraph.Text typography="t1">{record.score}점</Paragraph.Text>}
            caption={record.headline}
            testId="result-hero"
          />
          <Spacing size={16} />
          <Card testId="result-advice-card">
            <Paragraph.Text typography="st11">오늘의 조언</Paragraph.Text>
            <Spacing size={4} />
            <Paragraph.Text typography="t6">{record.advice}</Paragraph.Text>
            <Spacing size={12} />
            <Button variant="weak" display="block" onClick={() => nav('/share', { date })}>
              운세 카드 만들기
            </Button>
          </Card>
        </>
      )}
    </ScreenScaffold>
  );
}
