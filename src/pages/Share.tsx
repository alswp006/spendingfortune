import { Top, Paragraph, Spacing, Button } from '@toss/tds-mobile';
import { useLocation } from 'react-router-dom';
import { ScreenScaffold } from '@/components/ScreenScaffold';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/StateView';
import { useTypedNavigate } from '@/hooks/useTypedNavigate';
import { formatDate } from '@/lib/date';
import { getFortune } from '@/lib/storage';
import { TYPE_TABLE } from '@/lib/fortuneTable';
import type { RouteState } from '@/lib/types';

/**
 * /share — 운세 카드 공유.
 *
 * 라우팅 배선(Task 4.1)의 골격 + state 없는 직접 진입 방어. 카드 이미지·공유 액션은
 * Task 3.9가 이 파일에 채운다.
 */
export default function Share() {
  const nav = useTypedNavigate();
  const state = (useLocation().state as RouteState['/share']) ?? null;
  const record = state ? getFortune(state.date) : null;

  if (record == null) {
    return (
      <ScreenScaffold top={<Top title={<Top.TitleParagraph>운세 카드</Top.TitleParagraph>} />}>
        <EmptyState
          title="공유할 운세가 없어요"
          description="오늘의 운세를 먼저 확인해 주세요"
          action={
            <Button variant="weak" display="block" onClick={() => nav('/')}>
              홈으로 가기
            </Button>
          }
          testId="share-empty"
        />
      </ScreenScaffold>
    );
  }

  const typeName = TYPE_TABLE[record.typeId]?.name ?? '오늘의 소비운세';

  return (
    <ScreenScaffold top={<Top title={<Top.TitleParagraph>운세 카드</Top.TitleParagraph>} />}>
      <Card testId="share-card" style={{ aspectRatio: '3 / 4' }}>
        <Paragraph.Text typography="t2">{typeName}</Paragraph.Text>
        <Spacing size={8} />
        <Paragraph.Text typography="t1">{record.score}점</Paragraph.Text>
        <Spacing size={8} />
        <Paragraph.Text typography="t6">{record.headline}</Paragraph.Text>
        <Spacing size={8} />
        <Paragraph.Text typography="st11">{formatDate(record.date)}</Paragraph.Text>
      </Card>

      <Spacing size={16} />

      <Button variant="weak" display="block" onClick={() => nav('/result', { date: record.date })}>
        운세 다시 보기
      </Button>
    </ScreenScaffold>
  );
}
