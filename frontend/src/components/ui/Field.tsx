import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

const controlClass =
  'block w-full rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-sm text-ink-900 shadow-sm placeholder:text-ink-400 transition focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10 disabled:bg-ink-50 disabled:text-ink-500';

const errorClass = 'border-red-400 focus:border-red-500 focus:ring-red-500/10';

interface WrapperProps {
  label?: string;
  error?: string;
  hint?: string;
  id: string;
  children: ReactNode;
  className?: string;
}

function FieldWrapper({ label, error, hint, id, children, className }: WrapperProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-ink-700">
          {label}
        </label>
      )}
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-xs font-medium text-red-600" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-ink-500">{hint}</p>
      ) : null}
    </div>
  );
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  wrapperClassName?: string;
  leftIcon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, className, wrapperClassName, leftIcon, id, ...props },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <FieldWrapper label={label} error={error} hint={hint} id={inputId} className={wrapperClassName}>
      <div className="relative">
        {leftIcon && (
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-ink-400">{leftIcon}</span>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : undefined}
          className={cn(controlClass, !!leftIcon && 'pl-10', error && errorClass, className)}
          {...props}
        />
      </div>
    </FieldWrapper>
  );
});

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  wrapperClassName?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, error, hint, className, wrapperClassName, id, children, ...props },
  ref,
) {
  const autoId = useId();
  const selectId = id ?? autoId;
  return (
    <FieldWrapper label={label} error={error} hint={hint} id={selectId} className={wrapperClassName}>
      <select
        ref={ref}
        id={selectId}
        aria-invalid={!!error}
        className={cn(controlClass, 'appearance-none bg-select-arrow bg-[length:16px] bg-[right_0.75rem_center] bg-no-repeat pr-9', error && errorClass, className)}
        {...props}
      >
        {children}
      </select>
    </FieldWrapper>
  );
});

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
  wrapperClassName?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, hint, className, wrapperClassName, id, ...props },
  ref,
) {
  const autoId = useId();
  const textareaId = id ?? autoId;
  return (
    <FieldWrapper label={label} error={error} hint={hint} id={textareaId} className={wrapperClassName}>
      <textarea
        ref={ref}
        id={textareaId}
        rows={3}
        aria-invalid={!!error}
        className={cn(controlClass, 'resize-y', error && errorClass, className)}
        {...props}
      />
    </FieldWrapper>
  );
});

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
}

export function Toggle({ checked, onChange, label, description }: ToggleProps) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div>
        <label htmlFor={id} className="text-sm font-medium text-ink-900">
          {label}
        </label>
        {description && <p className="text-xs text-ink-500">{description}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
          checked ? 'bg-brand-600' : 'bg-ink-300',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
            checked ? 'translate-x-[22px]' : 'translate-x-0.5',
          )}
        />
      </button>
    </div>
  );
}

interface WeekdayPickerProps {
  value: number[];
  onChange: (days: number[]) => void;
  label?: string;
  error?: string;
}

const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function WeekdayPicker({ value, onChange, label, error }: WeekdayPickerProps) {
  const toggle = (day: number) =>
    onChange(value.includes(day) ? value.filter((d) => d !== day) : [...value, day].sort());
  return (
    <fieldset className="space-y-1.5">
      {label && <legend className="mb-1.5 text-sm font-medium text-ink-700">{label}</legend>}
      <div className="flex flex-wrap gap-1.5">
        {DAYS.map((name, day) => {
          const active = value.includes(day);
          return (
            <button
              key={name}
              type="button"
              aria-pressed={active}
              onClick={() => toggle(day)}
              className={cn(
                'h-9 min-w-[3rem] rounded-lg border px-2 text-xs font-semibold transition',
                active
                  ? 'border-brand-600 bg-brand-600 text-white'
                  : 'border-ink-200 bg-white text-ink-500 hover:border-brand-300 hover:text-brand-700',
              )}
            >
              {name}
            </button>
          );
        })}
      </div>
      {error && (
        <p className="text-xs font-medium text-red-600" role="alert">
          {error}
        </p>
      )}
    </fieldset>
  );
}
