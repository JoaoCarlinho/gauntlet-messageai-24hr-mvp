import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
  TouchableOpacityProps,
} from 'react-native';

export interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  textStyle?: TextStyle;
  style?: ViewStyle;
}

const Button: React.FC<ButtonProps> = ({
  title,
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  textStyle,
  style,
  onPress,
  ...props
}) => {
  const isDisabled = disabled || loading;

  const getButtonStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      ...styles.button,
      ...styles[`${variant}Button`],
      ...styles[`${size}Button`],
    };

    if (fullWidth) {
      baseStyle.width = '100%';
    }

    if (isDisabled) {
      baseStyle.opacity = 0.6;
    }

    return baseStyle;
  };

  const getTextStyle = (): TextStyle => {
    return {
      ...styles.text,
      ...styles[`${variant}Text`],
      ...styles[`${size}Text`],
    };
  };

  return (
    <TouchableOpacity
      style={[getButtonStyle(), style]}
      onPress={isDisabled ? undefined : onPress}
      activeOpacity={0.7}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? '#FFFFFF' : '#007AFF'}
        />
      ) : (
        <>
          {leftIcon && <>{leftIcon}</>}
          <Text style={[getTextStyle(), textStyle]}>{title}</Text>
          {rightIcon && <>{rightIcon}</>}
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },

  // Variant styles
  primaryButton: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  secondaryButton: {
    backgroundColor: '#F2F2F7',
    borderColor: '#F2F2F7',
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderColor: '#007AFF',
  },
  ghostButton: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  dangerButton: {
    backgroundColor: '#FF3B30',
    borderColor: '#FF3B30',
  },

  // Size styles
  smallButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 32,
  },
  mediumButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 44,
  },
  largeButton: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    minHeight: 52,
  },

  // Text styles
  text: {
    fontWeight: '600',
    textAlign: 'center',
  },

  // Variant text styles
  primaryText: {
    color: '#FFFFFF',
  },
  secondaryText: {
    color: '#000000',
  },
  outlineText: {
    color: '#007AFF',
  },
  ghostText: {
    color: '#007AFF',
  },
  dangerText: {
    color: '#FFFFFF',
  },

  // Size text styles
  smallText: {
    fontSize: 14,
  },
  mediumText: {
    fontSize: 16,
  },
  largeText: {
    fontSize: 18,
  },
});

export default Button;
