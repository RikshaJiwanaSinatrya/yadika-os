export type Operator = '+' | '−' | '×' | '÷';

export interface CalculatorState {
  /** Raw entry currently shown, e.g. "0", "-12.5", "Error". */
  display: string;
  accumulator: number | null;
  pendingOperator: Operator | null;
  isEnteringNumber: boolean;
  /** Remembers the last operation so "=" can be repeated. */
  lastOperand: number | null;
  lastOperator: Operator | null;
  lastExpression: string | null;
}

export const initialCalculatorState: CalculatorState = {
  display: '0',
  accumulator: null,
  pendingOperator: null,
  isEnteringNumber: false,
  lastOperand: null,
  lastOperator: null,
  lastExpression: null,
};

export type CalculatorAction =
  | { type: 'digit'; digit: string }
  | { type: 'decimal' }
  | { type: 'operator'; operator: Operator }
  | { type: 'equals' }
  | { type: 'clear' }
  | { type: 'backspace' }
  | { type: 'toggle-sign' }
  | { type: 'percent' };

const MAX_INPUT_LENGTH = 14;

function compute(a: number, b: number, operator: Operator): number {
  switch (operator) {
    case '+':
      return a + b;
    case '−':
      return a - b;
    case '×':
      return a * b;
    case '÷':
      return b === 0 ? NaN : a / b;
  }
}

function toRawString(value: number): string {
  if (!Number.isFinite(value)) return 'Error';
  // Trims floating point noise: 0.1 + 0.2 -> "0.3".
  return String(Number(value.toPrecision(12)));
}

function errorState(): CalculatorState {
  return { ...initialCalculatorState, display: 'Error' };
}

export function formatDisplay(raw: string): string {
  if (raw === 'Error') return raw;
  const negative = raw.startsWith('-');
  const body = negative ? raw.slice(1) : raw;
  const [integerPart, decimalPart] = body.split('.');
  const grouped = Number(integerPart || '0').toLocaleString('en-US');
  const withDecimal = decimalPart === undefined ? grouped : `${grouped}.${decimalPart}`;
  return negative ? `-${withDecimal}` : withDecimal;
}

export function calculatorReducer(state: CalculatorState, action: CalculatorAction): CalculatorState {
  switch (action.type) {
    case 'digit': {
      if (state.display === 'Error') {
        return { ...initialCalculatorState, display: action.digit, isEnteringNumber: true };
      }
      if (!state.isEnteringNumber) {
        return { ...state, display: action.digit, isEnteringNumber: true };
      }
      if (state.display.length >= MAX_INPUT_LENGTH) return state;
      if (state.display === '0') return { ...state, display: action.digit };
      if (state.display === '-0') return { ...state, display: `-${action.digit}` };
      return { ...state, display: state.display + action.digit };
    }

    case 'decimal': {
      if (state.display === 'Error') {
        return { ...initialCalculatorState, display: '0.', isEnteringNumber: true };
      }
      if (!state.isEnteringNumber) {
        return { ...state, display: '0.', isEnteringNumber: true };
      }
      if (state.display.includes('.') || state.display.length >= MAX_INPUT_LENGTH) return state;
      return { ...state, display: `${state.display}.` };
    }

    case 'operator': {
      if (state.display === 'Error') return state;

      // Let the user swap the pending operator before entering a new operand.
      if (state.pendingOperator !== null && !state.isEnteringNumber) {
        return { ...state, pendingOperator: action.operator };
      }

      const currentValue = Number.parseFloat(state.display);
      const accumulator =
        state.accumulator !== null && state.pendingOperator !== null
          ? compute(state.accumulator, currentValue, state.pendingOperator)
          : currentValue;

      if (!Number.isFinite(accumulator)) return errorState();

      return {
        ...state,
        accumulator,
        pendingOperator: action.operator,
        lastOperand: null,
        lastOperator: null,
        lastExpression: null,
        display: toRawString(accumulator),
        isEnteringNumber: false,
      };
    }

    case 'equals': {
      if (state.display === 'Error') return state;

      const currentValue = Number.parseFloat(state.display);
      let result: number;
      let expression: string;

      if (state.pendingOperator !== null && state.accumulator !== null) {
        const operand = state.isEnteringNumber ? currentValue : state.accumulator;
        result = compute(state.accumulator, operand, state.pendingOperator);
        expression = `${formatDisplay(toRawString(state.accumulator))} ${state.pendingOperator} ${formatDisplay(toRawString(operand))} =`;
      } else if (state.lastOperator !== null && state.lastOperand !== null) {
        result = compute(currentValue, state.lastOperand, state.lastOperator);
        expression = `${formatDisplay(toRawString(currentValue))} ${state.lastOperator} ${formatDisplay(toRawString(state.lastOperand))} =`;
      } else {
        return state;
      }

      if (!Number.isFinite(result)) return errorState();

      return {
        ...initialCalculatorState,
        display: toRawString(result),
        lastExpression: expression,
      };
    }

    case 'clear':
      return initialCalculatorState;

    case 'backspace': {
      if (state.display === 'Error') return initialCalculatorState;
      if (!state.isEnteringNumber) return state;
      const next = state.display.slice(0, -1);
      if (next === '' || next === '-') {
        return { ...state, display: '0', isEnteringNumber: false };
      }
      return { ...state, display: next };
    }

    case 'toggle-sign': {
      if (state.display === 'Error' || Number.parseFloat(state.display) === 0) return state;
      return {
        ...state,
        display: state.display.startsWith('-') ? state.display.slice(1) : `-${state.display}`,
      };
    }

    case 'percent': {
      if (state.display === 'Error') return state;
      const value = Number.parseFloat(state.display) / 100;
      if (!Number.isFinite(value)) return errorState();
      return { ...state, display: toRawString(value), isEnteringNumber: true };
    }
  }
}
