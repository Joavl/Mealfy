import React from 'react';
import { applyMask, inputModeForMask, type MaskType } from '../../utils/inputMasks';

interface MaskedInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  mask: MaskType;
  value: string;
  onValueChange: (value: string) => void;
}

const MaskedInput: React.FC<MaskedInputProps> = ({
  mask,
  value,
  onValueChange,
  inputMode,
  ...props
}) => (
  <input
    {...props}
    value={value}
    inputMode={inputMode ?? inputModeForMask(mask)}
    onChange={(e) => onValueChange(applyMask(mask, e.target.value))}
  />
);

export default MaskedInput;
