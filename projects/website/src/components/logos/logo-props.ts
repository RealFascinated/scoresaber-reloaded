export type LogoProps = {
  /**
   * The size of the logo
   */
  size?: number;

  /**
   * The class name of the logo
   */
  className?: string;
};

export type LogoBaseProps = LogoProps & {
  /**
   * The href to the logo.
   */
  href?: string;

  /**
   * The alt text of the logo
   */
  alt?: string;
};
