type MealfyLogoProps = {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  alt?: string;
};

const sizes = {
  sm: 40,
  md: 64,
  lg: 120,
  xl: 200,
};

export function MealfyLogo({ size = 'md', className = '', alt = 'Mealfy' }: MealfyLogoProps) {
  const px = sizes[size];
  return (
    <img
      src="/logo.png"
      alt={alt}
      width={px}
      height={px}
      className={`mealfy-logo ${className}`.trim()}
      style={{ width: px, height: px, objectFit: 'contain' }}
    />
  );
}
