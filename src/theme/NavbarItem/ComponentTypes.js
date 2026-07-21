import ComponentTypes from '@theme-original/NavbarItem/ComponentTypes';
import AuthButton from '@site/src/components/AuthButton';

// Register a custom navbar item type usable as {type: 'custom-authButton'}.
export default {
  ...ComponentTypes,
  'custom-authButton': AuthButton,
};
