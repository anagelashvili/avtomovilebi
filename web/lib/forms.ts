import type { FormEvent } from "react";

/**
 * onSubmit handler that passes the form's data to `fn` and keeps what the
 * person typed. (React 19 clears a form after an `action={…}` submit, even
 * when the server answered with a validation error — so on error people would
 * have to type everything again.)
 */
export function keepValues(fn: (data: FormData) => void) {
  return (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    fn(new FormData(e.currentTarget));
  };
}
