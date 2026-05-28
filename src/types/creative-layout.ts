export interface BrandPalette {
  bgGradientFrom?: string;
  bgGradientTo?: string;
  textPrimary?: string;
  accentPrimary?: string;
  [key: string]: string | undefined;
}

export type BlockType = 'text' | 'shape' | 'button' | 'image';
export type BlockRole = 'hook' | 'pain' | 'solution' | 'discount' | 'discount_bg' | 'cta' | 'logo' | string;

export interface BaseBlockSpec {
  id: string;
  type: BlockType;
  role: BlockRole;
  area: string; // e.g. top_center, under_headline, etc.
  zIndex: number;
  parent?: string; // ID of parent block if nested
}

export interface TextBlock extends BaseBlockSpec {
  type: 'text';
  text: string;
  fontRole: string; // e.g. display, body, highlight, badge
  colorRole: string; // maps to BrandPalette or generic color name
  align: 'left' | 'center' | 'right';
  maxWidth?: number; // percentage (0.0 to 1.0)
  maxLines?: number;
}

export interface ShapeBlock extends BaseBlockSpec {
  type: 'shape';
  shape: 'pill' | 'rect' | 'circle';
  bgColorRole: string;
}

export interface ButtonBlock extends BaseBlockSpec {
  type: 'button';
  text: string;
  bgColorRole: string;
  textColorRole: string;
  fontRole: string;
}

export interface ImageBlock extends BaseBlockSpec {
  type: 'image';
  source: 'placeholder' | string;
}

export type BlockSpec = TextBlock | ShapeBlock | ButtonBlock | ImageBlock;

export interface CreativeDocument {
  id: string;
  type: 'image_creative';
  size: { width: number; height: number };
  brandPalette?: BrandPalette;
  backgroundHint?: string; // used internally, passed to GPT Image
  blocks: BlockSpec[];
  meta?: {
    sourceBrief: string;
    createdByAi: boolean;
  };
}
