import { useRef, useState } from 'react';
import type { ChangeEvent, FocusEvent } from 'react';
import {
  Top,
  Paragraph,
  Spacing,
  Chip,
  ChipItem,
  TextField,
  Button,
  ListRow,
  Asset,
  Toast,
} from '@toss/tds-mobile';
import { ScreenScaffold } from '@/components/ScreenScaffold';
import { Card } from '@/components/Card';
import { Amount } from '@/components/Amount';
import { EmptyState } from '@/components/StateView';
import { SubmitFooter } from '@/components/BottomCTA';
import { useTypedNavigate } from '@/hooks/useTypedNavigate';
import { todayKST, addDays, formatDate } from '@/lib/date';
import { getDayLog, saveDayLog } from '@/lib/storage';
import { CATEGORY_LABEL, type CategoryId, type SpendingEntry } from '@/lib/types';

const CATEGORY_IDS = Object.keys(CATEGORY_LABEL) as CategoryId[];
const MAX_AMOUNT = 10_000_000;
const MAX_ENTRIES = 10;

function makeEntryId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * /input — 어제 지출 기록.
 *
 * 카테고리 칩 8종 + 금액/메모 입력 + "추가" 검증, 입력된 항목 목록(삭제 가능) +
 * 무지출 원탭 + 저장 후 /result 이동까지 담당한다 (F2-AC-1/2/3/4/5).
 */
export default function Input() {
  const nav = useTypedNavigate();
  const today = todayKST();
  const basisDate = addDays(today, -1);

  const [entries, setEntries] = useState<SpendingEntry[]>(() => getDayLog(basisDate).entries);
  const [category, setCategory] = useState<CategoryId | null>(null);
  const [amountDigits, setAmountDigits] = useState('');
  const [amountError, setAmountError] = useState<string | null>(null);
  const [memo, setMemo] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const amountRef = useRef<HTMLInputElement>(null);

  const total = entries.reduce((sum, e) => sum + e.amount, 0);

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
    if (entries.length >= MAX_ENTRIES) {
      setToastMessage('하루에 최대 10건까지 기록할 수 있어요');
      return;
    }
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
    setEntries((prev) => [
      ...prev,
      { id: makeEntryId(), category, amount: amountNum, memo, createdAt: Date.now() },
    ]);
    setAmountDigits('');
    setMemo('');
    amountRef.current?.blur();
  }

  function handleDelete(id: string) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  function submitLog(payload: { entries: SpendingEntry[]; noSpend: boolean; total: number }) {
    if (saving) return;
    setSaving(true);
    const result = saveDayLog({
      date: basisDate,
      entries: payload.entries,
      noSpend: payload.noSpend,
      total: payload.total,
      updatedAt: Date.now(),
    });
    if (result.ok) {
      setToastMessage('저장했어요');
      nav('/result', { date: today });
    } else {
      setToastMessage('저장하지 못했어요. 다시 시도해주세요');
      setSaving(false);
    }
  }

  function handleSubmit() {
    submitLog({ entries, noSpend: false, total });
  }

  function handleNoSpend() {
    submitLog({ entries: [], noSpend: true, total: 0 });
  }

  return (
    <ScreenScaffold
      top={<Top title={<Top.TitleParagraph>어제 지출 기록</Top.TitleParagraph>} />}
      bottom={
        <SubmitFooter
          label="운세 보기"
          onClick={handleSubmit}
          disabled={entries.length === 0}
          loading={saving}
        />
      }
    >
      <Card testId="input-basis-card">
        <Paragraph.Text typography="st11">기록할 날짜</Paragraph.Text>
        <Spacing size={4} />
        <Paragraph.Text typography="t2">{formatDate(basisDate)}</Paragraph.Text>
      </Card>

      <Spacing size={16} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Paragraph.Text typography="st11">{entries.length}건 기록</Paragraph.Text>
        <Amount value={total} typography="t3" testId="entries-total" />
      </div>

      <Spacing size={8} />

      {entries.length > 0 ? (
        <Card testId="input-entries-card">
          {entries.map((entry, index) => (
            <div key={entry.id} data-testid="entry-item">
              {index > 0 && <Spacing size={4} />}
              <ListRow
                contents={
                  <ListRow.Texts
                    type="2RowTypeA"
                    top={`${CATEGORY_LABEL[entry.category]}${entry.memo ? ` · ${entry.memo}` : ''}`}
                    bottom={`${entry.amount.toLocaleString('ko-KR')}원`}
                  />
                }
                right={
                  <Button
                    variant="weak"
                    size="small"
                    style={{ minWidth: 44, minHeight: 44 }}
                    onClick={() => handleDelete(entry.id)}
                  >
                    삭제
                  </Button>
                }
              />
            </div>
          ))}
        </Card>
      ) : (
        <EmptyState
          icon={
            <Asset.Image
              frameShape={{ width: 72, height: 72, radius: 20 }}
              src="/characters/zero_spender.png"
              alt="아직 담은 지출이 없어요"
            />
          }
          title="어제 쓴 돈을 하나씩 담아주세요"
          testId="entries-empty"
        />
      )}

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

      <Spacing size={24} />

      <Button variant="weak" size="large" display="block" onClick={handleNoSpend}>
        어제 무지출이었어요
      </Button>

      <Toast open={toastMessage !== null} text={toastMessage ?? ''} position="bottom" />
    </ScreenScaffold>
  );
}
