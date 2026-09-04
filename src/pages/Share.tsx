import { useState } from 'react';
import { Top, Paragraph, Spacing, Button, Badge, Toast } from '@toss/tds-mobile';
import { useLocation } from 'react-router-dom';
import { ScreenScaffold } from '@/components/ScreenScaffold';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/StateView';
import { SubmitFooter } from '@/components/BottomCTA';
import { Amount } from '@/components/Amount';
import { useTypedNavigate } from '@/hooks/useTypedNavigate';
import { todayKST } from '@/lib/date';
import { getFortune } from '@/lib/storage';
import { TYPE_TABLE } from '@/lib/fortuneTable';
import type { RouteState } from '@/lib/types';

/**
 * /share — 결과 공유 카드.
 *
 * location.state.date의 FortuneRecord로 세로 카드를 렌더하고, '문구 복사하기'로
 * 클립보드에 텍스트를 복사한 뒤 성공/실패 Toast를 보여준다. 외부 앱 이동은 없다.
 */
export default function Share() {
  const nav = useTypedNavigate();
  const state = (useLocation().state as RouteState['/share']) ?? null;
  const record = state ? getFortune(state.date) : null;
  const [toast, setToast] = useState<string | null>(null);

  if (record == null) {
    return (
      <ScreenScaffold top={<Top title={<Top.TitleParagraph>공유 카드</Top.TitleParagraph>} />}>
        <EmptyState
          title="공유할 운세가 없어요"
          description="오늘의 운세를 먼저 확인해 주세요"
          action={
            <Button variant="weak" display="block" onClick={() => nav('/result', { date: todayKST() })}>
              오늘 운세 보기
            </Button>
          }
          testId="share-empty"
        />
      </ScreenScaffold>
    );
  }

  if (!record.unlocked) {
    return (
      <ScreenScaffold top={<Top title={<Top.TitleParagraph>공유 카드</Top.TitleParagraph>} />}>
        <EmptyState
          title="운세를 먼저 확인해주세요"
          action={
            <Button variant="weak" display="block" onClick={() => nav('/result', { date: record.date })}>
              운세 확인하러 가기
            </Button>
          }
          testId="share-locked"
        />
      </ScreenScaffold>
    );
  }

  const typeInfo = TYPE_TABLE[record.typeId];

  const handleCopy = () => {
    const text = `오늘의 소비운세 ${record.score}점 · ${typeInfo.name}\n${record.headline}`;
    try {
      navigator.clipboard
        .writeText(text)
        .then(() => setToast('복사했어요'))
        .catch(() => setToast('복사를 지원하지 않는 환경이에요. 카드를 길게 눌러 저장해주세요'));
    } catch {
      setToast('복사를 지원하지 않는 환경이에요. 카드를 길게 눌러 저장해주세요');
    }
  };

  return (
    <ScreenScaffold
      top={<Top title={<Top.TitleParagraph>공유 카드</Top.TitleParagraph>} />}
      bottom={<SubmitFooter label="문구 복사하기" onClick={handleCopy} testId="copy-button" />}
    >
      <Card testId="share-card">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <img src={typeInfo.imageSrc} width={200} height={200} alt={typeInfo.name} />
          <Spacing size={12} />
          <Paragraph.Text typography="t3">{typeInfo.name}</Paragraph.Text>
          <Spacing size={8} />
          <Amount value={record.score} unit="점" typography="t1" />
          <Spacing size={8} />
          <Paragraph.Text typography="t6">{record.headline}</Paragraph.Text>
          <Spacing size={12} />
          <Badge size="medium" variant="weak" color="elephant">
            지출 기록으로 만든 재미용 콘텐츠예요
          </Badge>
        </div>
      </Card>

      <Spacing size={16} />

      <Paragraph.Text typography="t7">화면을 캡처해서 친구에게 보여주세요</Paragraph.Text>

      <Toast open={toast !== null} text={toast ?? ''} position="bottom" />
    </ScreenScaffold>
  );
}
