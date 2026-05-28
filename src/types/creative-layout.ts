export interface BrandPalette {
  bgGradientFrom?: string;
  bgGradientTo?: string;
  textPrimary?: string;
  textSecondary?: string;
  accentPrimary?: string;
  accentSecondary?: string;
  [key: string]: string | undefined;
}

export type BlockType = 'text' | 'shape' | 'button' | 'image';

export type TextRole = 'hook' | 'pain' | 'solution' | 'benefit' | 'body' | 'discount' | 'cta' | 'legal' | string;
export type FontRole = 'display' | 'body' | 'badge' | 'highlight';
export type ColorRole =
  | 'text_primary'
  | 'text_secondary'
  | 'text_on_accent'
  | 'accent_primary'
  | 'accent_secondary'
  | 'bg_surface'
  | 'bg_accent'
  | string; // allow hex fallback

export type Area =
  | 'top_left' | 'top_center' | 'top_right'
  | 'under_headline'
  | 'middle_left' | 'middle_center' | 'middle_right'
  | 'above_cta'
  | 'bottom_left' | 'bottom_center' | 'bottom_right'
  | string;

export interface StyleHints {
  uppercase?: boolean;
  shadow?: boolean;
  bold?: boolean;
  italic?: boolean;
}

export interface BaseBlockSpec {
  id: string;
  type: BlockType;
  role: string;
  area: Area;
  zIndex: number;
  parent?: string;
  // Runtime pixel coords (set by frontend after area → px conversion)
  x?: number;
  y?: number;
  w?: number;
  h?: number;
}

export interface TextBlock extends BaseBlockSpec {
  type: 'text';
  text: string;
  fontRole: FontRole;
  colorRole: ColorRole;
  align: 'left' | 'center' | 'right';
  maxWidth?: number;
  maxLines?: number;
  styleHints?: StyleHints;
  fontFamily?: string;
  fontSize?: number;
}

export interface ShapeBlock extends BaseBlockSpec {
  type: 'shape';
  shape: 'pill' | 'rect' | 'rounded_rect' | 'circle';
  bgColorRole: ColorRole;
  cornerRadius?: number;
  padding?: number;
}

export interface ButtonBlock extends BaseBlockSpec {
  type: 'button';
  text: string;
  bgColorRole: ColorRole;
  textColorRole: ColorRole;
  fontRole: FontRole;
  styleHints?: StyleHints;
}

export interface ImageBlock extends BaseBlockSpec {
  type: 'image';
  role: 'logo' | 'icon' | 'extra_image' | string;
  source: 'placeholder' | 'user_upload' | 'url';
  imageUrl?: string;
}

export type BlockSpec = TextBlock | ShapeBlock | ButtonBlock | ImageBlock;

export interface CreativeDocument {
  id: string;
  type: 'image_creative';
  size: { width: number; height: number };
  brandPalette?: BrandPalette;
  backgroundHint?: string;
  blocks: BlockSpec[];
  meta?: {
    sourceBrief?: string;
    createdByAi: boolean;
    version?: string;
  };
}
