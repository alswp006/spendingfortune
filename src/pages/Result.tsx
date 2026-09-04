import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Top, Paragraph, Spacing, Button, Chip, ChipItem, ListRow } from '@toss/tds-mobile';
import { generateHapticFeedback } from '@apps-in-toss/web-framework';
import { ScreenScaffold } from '@/components/ScreenScaffold';
import { Card } from '@/components/Card';
import { SummaryHero } from '@/components/SummaryHero';
import { Amount } from '@/components/Amount';
import { EmptyState } from '@/components/StateView';
import { TossRewardAd } from '@/components/TossRewardAd';
import { AdSection } from '@/components/AdSection';
import { useTypedNavigate } from '@/hooks/useTypedNavigate';
import { todayKST } from '@/lib/date';
import { formatNumber } from '@/lib/utils';
import { computeFortune, unlockFortune } from '@/lib/computeFortune';
import { TYPE_TABLE } from '@/lib/fortuneTable';
import { CATEGORY_LABEL } from '@/lib/types';
import type { RouteState } from '@/lib/types';

const AD_SLOT_ID = import.meta.env.VITE_TOSS_AD_SLOT_ID || 'result-unlock';
const LOCK_MESSAGE = '광고를 보면 오늘의 소비운세가 열려요';

// SDK 호출은 WebView 밖(로컬 브라우저 등)에서 throw한다 — 조용히 무시하고 진행한다.
function safeHaptic(type: 'tickWeak' | 'success') {
  try {
    generateHapticFeedback({ type });
  } catch {
    // ignore
  }
}

/**
 * /result — 오늘의 소비운세.
 *
 * state.date(없으면 todayKST())로 computeFortune을 1회 호출해 세 상태를 렌더한다:
 * 근거일 기록 없음(EmptyState) · 잠금(TossRewardAd 게이트) · 공개(전체 결과).
 * 잠금 해제는 리워드 광고 시청 완료 콜백에서 unlockFortune으로 영속화한다.
 */
export default function Result() {
  const nav = useTypedNavigate();
  const state = (useLocation().state as RouteState['/result']) ?? null;
  const date = state?.date ?? todayKST();
  const result = computeFortune(date);

  const [unlocked, setUnlocked] = useState(result.ok ? result.value.unlocked : false);

  if (!result.ok) {
    return (
      <ScreenScaffold top={<Top title={<Top.TitleParagraph>오늘의 소비운세</Top.TitleParagraph>} />}>
        <EmptyState
          title={
            result.reason === 'NO_BASIS_LOG'
              ? '어제 기록이 없어서 운세를 만들 수 없어요'
              : '운세를 불러오지 못했어요'
          }
          action={
            <Button variant="weak" display="block" onClick={() => nav('/input')}>
              어제 지출 기록하기
            </Button>
          }
          testId="result-empty"
        />
      </ScreenScaffold>
    );
  }

  const record = result.value;
  const typeInfo = TYPE_TABLE[record.typeId];

  const handleRewarded = () => {
    safeHaptic('tickWeak');
    const unlockResult = unlockFortune(date);
    if (unlockResult.ok) {
      setUnlocked(true);
    }
  };

  const handleShare = () => {
    safeHaptic('success');
    nav('/share', { date });
  };

  const content = (
    <>
      <div data-testid="content-notice-badge">
        <Paragraph.Text typography="st13">재미로 보는 콘텐츠예요</Paragraph.Text>
      </div>

      <Spacing size={8} />

      <SummaryHero
        testId="fortune-hero"
        label="오늘의 소비운"
        value={<Amount value={record.score} unit="점" typography="t1" />}
        caption={`어제 지출 ${formatNumber(record.yesterdayTotal)}원 기준`}
      />

      <Spacing size={16} />

      <Card testId="character-card">
        <img src={typeInfo.imageSrc} width={160} height={160} alt={typeInfo.name} />
        <Spacing size={8} />
        <ListRow contents={<ListRow.Texts type="2RowTypeA" top={typeInfo.name} bottom={typeInfo.tagline} />} />
      </Card>

      <Spacing size={16} />

      <Card testId="advice-card">
        <Paragraph.Text typography="t4">{record.headline}</Paragraph.Text>
        <Spacing size={8} />
        <Paragraph.Text typography="t6">{record.advice}</Paragraph.Text>
        <Spacing size={12} />
        <ListRow
          contents={<ListRow.Texts type="2RowTypeA" top="절약 팁" bottom={record.savingTip} />}
          right={<Amount value={record.estimatedSaving} unit="원" />}
        />
      </Card>

      <Spacing size={12} />

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <div>
          <Paragraph.Text typography="st13">오늘 좋아요</Paragraph.Text>
          <Chip kind="action">
            <ChipItem>{CATEGORY_LABEL[record.luckyCategory]}</ChipItem>
          </Chip>
        </div>
        {record.cautionCategory ? (
          <div>
            <Paragraph.Text typography="st13">주의</Paragraph.Text>
            <Chip kind="action">
              <ChipItem>{CATEGORY_LABEL[record.cautionCategory]}</ChipItem>
            </Chip>
          </div>
        ) : null}
      </div>

      {record.alerts.slice(0, 2).map((alert, i) => (
        <div key={alert.rule}>
          <Spacing size={i === 0 ? 16 : 8} />
          <Card testId="result-alert">
            <ListRow
              contents={
                <ListRow.Texts
                  type="2RowTypeA"
                  top={alert.level === 'danger' ? '지름신 주의보' : '소비 쏠림 주의'}
                  bottom={alert.message}
                />
              }
            />
          </Card>
        </div>
      ))}

      <Spacing size={16} />
      <AdSection />
      <Spacing size={16} />

      <Button variant="fill" display="block" onClick={handleShare}>
        공유 카드 만들기
      </Button>
    </>
  );

  return (
    <ScreenScaffold top={<Top title={<Top.TitleParagraph>오늘의 소비운세</Top.TitleParagraph>} />}>
      {unlocked ? (
        content
      ) : (
        <>
          <Card testId="fortune-lock-card">
            <Paragraph.Text typography="t6">{LOCK_MESSAGE}</Paragraph.Text>
          </Card>
          <Spacing size={16} />
          <TossRewardAd
            slotId={AD_SLOT_ID}
            description={LOCK_MESSAGE}
            buttonText="운세 확인하기"
            buttonTestId="unlock-button"
            onRewarded={handleRewarded}
          >
            {content}
          </TossRewardAd>
        </>
      )}
    </ScreenScaffold>
  );
}
