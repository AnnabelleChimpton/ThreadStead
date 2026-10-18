import React from "react";
import { buttonClasses, type ButtonVariant, type ButtonSize } from "@/components/ui/ButtonLink";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** "danger" for deletes and other things that can't be undone */
  variant?: ButtonVariant;
  size?: ButtonSize;
}

/**
 * The site's button: the theme's peach bevel (`.btn`), same look as
 * ButtonLink. Defaults to type="button" so it never submits a form by
 * accident; pass type="submit" when it should.
 */
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", type = "button", className, ...props },
  ref,
) {
  const classes = buttonClasses(variant, size, { inline: false });
  return <button ref={ref} type={type} className={className ? `${classes} ${className}` : classes} {...props} />;
});

export default Button;
