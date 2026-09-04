import { useRef, useState } from 'react';
import type { ChangeEvent, FocusEvent } from 'react';
import { Top, Paragraph, Spacing, Chip, ChipItem, TextField, Button } from '@toss/tds-mobile';
import { ScreenScaffold } from '@/components/ScreenScaffold';
import { Card } from '@/components/Card';
import { SubmitFooter } from '@/components/BottomCTA';
import { useTypedNavigate } from '@/hooks/useTypedNavigate';
import { todayKST, addDays, formatDate } from '@/lib/date';
import { getDayLog } from '@/lib/storage';
import { CATEGORY_LABEL, type CategoryId } from '@/lib/types';

const CATEGORY_IDS = Object.keys(CATEGORY_LABEL) as CategoryId[];
const MAX_AMOUNT = 10_000_000;

/**
 * /input — 어제 지출 기록.
 *
 * Task 3.1 범위: 카테고리 칩 8종 + 금액/메모 입력 + "추가" 검증만 담당한다.
 * 항목 목록·10건 상한·무지출·저장 후 /result 이동은 Task 3.2가 이어서 붙인다
 * (F2-AC-1/2/3/6/7) — 여기서 새로 만들지 말고 이 파일을 확장하라.
 */
export default function Input() {
  const nav = useTypedNavigate();
  const today = todayKST();
  const basisDate = addDays(today, -1);
  const log = getDayLog(basisDate);
  const hasLog = log.noSpend || log.entries.length > 0;

  const [category, setCategory] = useState<CategoryId | null>(null);
  const [amountDigits, setAmountDigits] = useState('');
  const [amountError, setAmountError] = useState<string | null>(null);
  const [memo, setMemo] = useState('');
  const amountRef = useRef<HTMLInputElement>(null);

  const amountDisplay = amountDigits ? Number(amountDigits).toLocaleString('ko-KR') : '';

  function handleAmountChange(e: ChangeEvent<HTMLInputElement>) {
    setAmountDigits(e.target.value.replace(/[^0-9]/g, ''));
    setAmountError(null);
  }

  function handleAmountFocus(e: FocusEvent<HTMLInputElement>) {
    try {
      e.currentTarget.scrollIntoView({ block: 'center' });
    } catch {
      /* jsdom 이외 환경에서 scrollIntoView 미구현일 수 있음 — 무시 */
    }
  }

  function handleAdd() {
    if (!category) return;
    const amountNum = Number(amountDigits || '0');
    if (!amountDigits || amountNum <= 0) {
      setAmountError('금액을 입력해주세요');
      return;
    }
    if (amountNum > MAX_AMOUNT) {
      setAmountError('1천만원 이하로 입력해주세요');
      return;
    }
    setAmountError(null);
    // Task 3.2에서 항목 목록·localStorage 저장 연동
    setAmountDigits('');
    setMemo('');
    amountRef.current?.blur();
  }

  return (
    <ScreenScaffold
      top={<Top title={<Top.TitleParagraph>어제 지출 기록</Top.TitleParagraph>} />}
      bottom={<SubmitFooter label="운세 보기" onClick={() => nav('/result', { date: today })} />}
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

      <Paragraph.Text typography="st11">카테고리</Paragraph.Text>
      <Spacing size={8} />
      <Chip kind="select" wrap>
        {CATEGORY_IDS.map((id) => (
          <ChipItem
            key={id}
            data-testid={`category-chip-${id}`}
            selected={category === id}
            onClick={() => setCategory(id)}
          >
            {CATEGORY_LABEL[id]}
          </ChipItem>
        ))}
      </Chip>

      <Spacing size={16} />

      <TextField
        ref={amountRef}
        variant="line"
        label="금액"
        placeholder="예: 12,000원"
        inputMode="numeric"
        enterKeyHint="done"
        data-testid="amount-input"
        value={amountDisplay}
        onChange={handleAmountChange}
        onFocus={handleAmountFocus}
        hasError={!!amountError}
        help={amountError ?? undefined}
      />

      <Spacing size={12} />

      <TextField
        variant="line"
        label="메모"
        placeholder="예: 점심"
        maxLength={30}
        enterKeyHint="done"
        data-testid="memo-input"
        value={memo}
        onChange={(e: ChangeEvent<HTMLInputElement>) => setMemo(e.target.value)}
      />

      <Spacing size={16} />

      <Button variant="weak" display="block" onClick={handleAdd}>
        추가
      </Button>
    </ScreenScaffold>
  );
}
