import * as React from 'react';
import { composeEventHandlers } from '@radix-ui/primitive';
import { composeRefs } from '@radix-ui/react-compose-refs';
import { createContextScope } from '@radix-ui/react-context';
import { useControllableState } from '@radix-ui/react-use-controllable-state';
import { Primitive } from '@radix-ui/react-primitive';
import * as MenuPrimitive from '@radix-ui/react-menu';
import { createMenuScope } from '@radix-ui/react-menu';
import { useId } from '@radix-ui/react-id';

import type * as Radix from '@radix-ui/react-primitive';
import type { Scope } from '@radix-ui/react-context';

type Direction = 'ltr' | 'rtl';

/* -------------------------------------------------------------------------------------------------
 * DropdownMenu
 * -----------------------------------------------------------------------------------------------*/

const DROPDOWN_MENU_NAME = 'DropdownMenu';

type ScopedProps<P> = P & { __scopeDropdownMenu?: Scope };
const [createDropdownMenuContext, createDropdownMenuScope] = createContextScope(
  DROPDOWN_MENU_NAME,
  [createMenuScope]
);
const useMenuScope = createMenuScope();

type DropdownMenuRootContextValue = {
  isRootMenu: true;
  triggerId: string;
  triggerRef: React.RefObject<HTMLButtonElement>;
  contentId: string;
  open: boolean;
  onOpenChange(open: boolean): void;
  onOpenToggle(): void;
  modal: boolean;
};

type DropdownMenuSubContextValue = {
  isRootMenu: false;
  open: boolean;
  onOpenChange(open: boolean): void;
};

const [DropdownMenuProvider, useDropdownMenuContext] = createDropdownMenuContext<
  DropdownMenuRootContextValue | DropdownMenuSubContextValue
>(DROPDOWN_MENU_NAME);

interface DropdownMenuProps {
  children?: React.ReactNode;
  dir?: Direction;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?(open: boolean): void;
  modal?: boolean;
}

const DropdownMenu: React.FC<DropdownMenuProps> = (props: ScopedProps<DropdownMenuProps>) => {
  const {
    __scopeDropdownMenu,
    children,
    dir,
    open: openProp,
    defaultOpen,
    onOpenChange,
    modal = true,
  } = props;
  const menuScope = useMenuScope(__scopeDropdownMenu);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const [open = false, setOpen] = useControllableState({
    prop: openProp,
    defaultProp: defaultOpen,
    onChange: onOpenChange,
  });

  return (
    <DropdownMenuProvider
      scope={__scopeDropdownMenu}
      isRootMenu={true}
      triggerId={useId()}
      triggerRef={triggerRef}
      contentId={useId()}
      open={open}
      onOpenChange={setOpen}
      onOpenToggle={React.useCallback(() => setOpen((prevOpen) => !prevOpen), [setOpen])}
      modal={modal}
    >
      <MenuPrimitive.Root {...menuScope} open={open} onOpenChange={setOpen} dir={dir} modal={modal}>
        {children}
      </MenuPrimitive.Root>
    </DropdownMenuProvider>
  );
};

DropdownMenu.displayName = DROPDOWN_MENU_NAME;

/* -------------------------------------------------------------------------------------------------
 * DropdownMenuSub
 * -----------------------------------------------------------------------------------------------*/

interface DropdownMenuSubProps {
  children?: React.ReactNode;
  open?: boolean;
  onOpenChange?(open: boolean): void;
  defaultOpen?: boolean;
}

const DropdownMenuSub: React.FC<DropdownMenuSubProps> = (
  props: ScopedProps<DropdownMenuSubProps>
) => {
  const { __scopeDropdownMenu, children, open: openProp, onOpenChange, defaultOpen } = props;
  const menuScope = useMenuScope(__scopeDropdownMenu);
  const [open = false, setOpen] = useControllableState({
    prop: openProp,
    defaultProp: defaultOpen,
    onChange: onOpenChange,
  });

  return (
    <DropdownMenuProvider
      scope={__scopeDropdownMenu}
      isRootMenu={false}
      open={open}
      onOpenChange={setOpen}
    >
      <MenuPrimitive.Sub {...menuScope} open={open} onOpenChange={setOpen}>
        {children}
      </MenuPrimitive.Sub>
    </DropdownMenuProvider>
  );
};

/* -------------------------------------------------------------------------------------------------
 * DropdownMenuTrigger
 * -----------------------------------------------------------------------------------------------*/

const TRIGGER_NAME = 'DropdownMenuTrigger';

type DropdownMenuTriggerElement = React.ElementRef<typeof Primitive.button>;
type PrimitiveButtonProps = Radix.ComponentPropsWithoutRef<typeof Primitive.button>;
interface DropdownMenuTriggerProps extends PrimitiveButtonProps {}

const DropdownMenuTrigger = React.forwardRef<DropdownMenuTriggerElement, DropdownMenuTriggerProps>(
  (props: ScopedProps<DropdownMenuTriggerProps>, forwardedRef) => {
    const { __scopeDropdownMenu, disabled = false, ...triggerProps } = props;
    const context = useDropdownMenuContext(TRIGGER_NAME, __scopeDropdownMenu);
    const menuScope = useMenuScope(__scopeDropdownMenu);
    return context.isRootMenu ? (
      <MenuPrimitive.Anchor asChild {...menuScope}>
        <Primitive.button
          type="button"
          id={context.triggerId}
          aria-haspopup="menu"
          aria-expanded={context.open ? true : undefined}
          aria-controls={context.open ? context.contentId : undefined}
          data-state={context.open ? 'open' : 'closed'}
          data-disabled={disabled ? '' : undefined}
          disabled={disabled}
          {...triggerProps}
          ref={composeRefs(forwardedRef, context.triggerRef)}
          onPointerDown={composeEventHandlers(props.onPointerDown, (event) => {
            // only call handler if it's the left button (mousedown gets triggered by all mouse buttons)
            // but not when the control key is pressed (avoiding MacOS right click)
            if (!disabled && event.button === 0 && event.ctrlKey === false) {
              context.onOpenToggle();
              // prevent trigger focusing when opening
              // this allows the content to be given focus without competition
              if (!context.open) event.preventDefault();
            }
          })}
          onKeyDown={composeEventHandlers(props.onKeyDown, (event) => {
            if (disabled) return;
            if (['Enter', ' '].includes(event.key)) context.onOpenToggle();
            if (event.key === 'ArrowDown') context.onOpenChange(true);
            // prevent keypresses from scrolling window
            if ([' ', 'ArrowDown'].includes(event.key)) event.preventDefault();
          })}
        />
      </MenuPrimitive.Anchor>
    ) : null;
  }
);

DropdownMenuTrigger.displayName = TRIGGER_NAME;

/* -------------------------------------------------------------------------------------------------
 * DropdownMenuSubTrigger
 * -----------------------------------------------------------------------------------------------*/

const SUB_TRIGGER_NAME = 'DropdownMenuSubTrigger';

type DropdownMenuSubTriggerElement = React.ElementRef<typeof MenuPrimitive.SubTrigger>;
type MenuSubTriggerProps = Radix.ComponentPropsWithoutRef<typeof MenuPrimitive.SubTrigger>;
interface DropdownMenuSubTriggerProps extends MenuSubTriggerProps {}

const DropdownMenuSubTrigger = React.forwardRef<
  DropdownMenuSubTriggerElement,
  DropdownMenuSubTriggerProps
>((props: ScopedProps<DropdownMenuSubTriggerProps>, forwardedRef) => {
  const { __scopeDropdownMenu, ...subTriggerProps } = props;
  const menuScope = useMenuScope(__scopeDropdownMenu);
  return <MenuPrimitive.SubTrigger {...menuScope} {...subTriggerProps} ref={forwardedRef} />;
});

DropdownMenuSubTrigger.displayName = SUB_TRIGGER_NAME;

/* -------------------------------------------------------------------------------------------------
 * DropdownMenuContent
 * -----------------------------------------------------------------------------------------------*/

const CONTENT_NAME = 'DropdownMenuContent';

type DropdownMenuContentElement =
  | DropdownMenuRootContentElement
  | React.ElementRef<typeof MenuPrimitive.Content>;
type MenuContentProps = Radix.ComponentPropsWithoutRef<typeof MenuPrimitive.Content>;
interface DropdownMenuContentProps extends DropdownMenuRootContentProps, MenuContentProps {}

const DropdownMenuContent = React.forwardRef<DropdownMenuContentElement, DropdownMenuContentProps>(
  (props: ScopedProps<DropdownMenuContentProps>, forwardedRef) => {
    const { __scopeDropdownMenu, ...contentProps } = props;
    const context = useDropdownMenuContext(CONTENT_NAME, __scopeDropdownMenu);
    const menuScope = useMenuScope(__scopeDropdownMenu);
    const commonProps = {
      ...contentProps,
      style: {
        ...props.style,
        // re-namespace exposed content custom property
        ['--radix-dropdown-menu-content-transform-origin' as any]:
          'var(--radix-popper-transform-origin)',
      },
    };

    return context.isRootMenu ? (
      <DropdownMenuRootContent
        __scopeDropdownMenu={__scopeDropdownMenu}
        {...commonProps}
        ref={forwardedRef}
      />
    ) : (
      <MenuPrimitive.Content {...menuScope} {...commonProps} ref={forwardedRef} />
    );
  }
);

DropdownMenuContent.displayName = CONTENT_NAME;

/* ---------------------------------------------------------------------------------------------- */

type DropdownMenuRootContentElement = React.ElementRef<typeof MenuPrimitive.Content>;
interface DropdownMenuRootContentProps extends ScopedProps<MenuContentProps> {}

const DropdownMenuRootContent = React.forwardRef<
  DropdownMenuRootContentElement,
  DropdownMenuRootContentProps
>((props, forwardedRef) => {
  const { __scopeDropdownMenu, portalled = true, ...contentProps } = props;
  const context = useDropdownMenuContext(CONTENT_NAME, __scopeDropdownMenu);
  const menuScope = useMenuScope(__scopeDropdownMenu);
  const hasInteractedOutsideRef = React.useRef(false);
  return context.isRootMenu ? (
    <MenuPrimitive.Content
      id={context.contentId}
      aria-labelledby={context.triggerId}
      {...menuScope}
      {...contentProps}
      ref={forwardedRef}
      portalled={portalled}
      onCloseAutoFocus={composeEventHandlers(props.onCloseAutoFocus, (event) => {
        if (!hasInteractedOutsideRef.current) context.triggerRef.current?.focus();
        hasInteractedOutsideRef.current = false;
        // Always prevent auto focus because we either focus manually or want user agent focus
        event.preventDefault();
      })}
      onInteractOutside={composeEventHandlers(props.onInteractOutside, (event) => {
        const originalEvent = event.detail.originalEvent as PointerEvent;
        const ctrlLeftClick = originalEvent.button === 0 && originalEvent.ctrlKey === true;
        const isRightClick = originalEvent.button === 2 || ctrlLeftClick;
        if (!context.modal || isRightClick) hasInteractedOutsideRef.current = true;
      })}
    />
  ) : null;
});

/* -------------------------------------------------------------------------------------------------
 * DropdownMenuGroup
 * -----------------------------------------------------------------------------------------------*/

const GROUP_NAME = 'DropdownMenuGroup';

type DropdownMenuGroupElement = React.ElementRef<typeof MenuPrimitive.Group>;
type MenuGroupProps = Radix.ComponentPropsWithoutRef<typeof MenuPrimitive.Group>;
interface DropdownMenuGroupProps extends MenuGroupProps {}

const DropdownMenuGroup = React.forwardRef<DropdownMenuGroupElement, DropdownMenuGroupProps>(
  (props: ScopedProps<DropdownMenuGroupProps>, forwardedRef) => {
    const { __scopeDropdownMenu, ...groupProps } = props;
    const menuScope = useMenuScope(__scopeDropdownMenu);
    return <MenuPrimitive.Group {...menuScope} {...groupProps} ref={forwardedRef} />;
  }
);

DropdownMenuGroup.displayName = GROUP_NAME;

/* -------------------------------------------------------------------------------------------------
 * DropdownMenuLabel
 * -----------------------------------------------------------------------------------------------*/

const LABEL_NAME = 'DropdownMenuLabel';

type DropdownMenuLabelElement = React.ElementRef<typeof MenuPrimitive.Label>;
type MenuLabelProps = Radix.ComponentPropsWithoutRef<typeof MenuPrimitive.Label>;
interface DropdownMenuLabelProps extends MenuLabelProps {}

const DropdownMenuLabel = React.forwardRef<DropdownMenuLabelElement, DropdownMenuLabelProps>(
  (props: ScopedProps<DropdownMenuLabelProps>, forwardedRef) => {
    const { __scopeDropdownMenu, ...labelProps } = props;
    const menuScope = useMenuScope(__scopeDropdownMenu);
    return <MenuPrimitive.Label {...menuScope} {...labelProps} ref={forwardedRef} />;
  }
);

DropdownMenuLabel.displayName = LABEL_NAME;

/* -------------------------------------------------------------------------------------------------
 * DropdownMenuItem
 * -----------------------------------------------------------------------------------------------*/

const ITEM_NAME = 'DropdownMenuItem';

type DropdownMenuItemElement = React.ElementRef<typeof MenuPrimitive.Item>;
type MenuItemProps = Radix.ComponentPropsWithoutRef<typeof MenuPrimitive.Item>;
interface DropdownMenuItemProps extends MenuItemProps {}

const DropdownMenuItem = React.forwardRef<DropdownMenuItemElement, DropdownMenuItemProps>(
  (props: ScopedProps<DropdownMenuItemProps>, forwardedRef) => {
    const { __scopeDropdownMenu, ...itemProps } = props;
    const menuScope = useMenuScope(__scopeDropdownMenu);
    return <MenuPrimitive.Item {...menuScope} {...itemProps} ref={forwardedRef} />;
  }
);

DropdownMenuItem.displayName = ITEM_NAME;

/* -------------------------------------------------------------------------------------------------
 * DropdownMenuCheckboxItem
 * -----------------------------------------------------------------------------------------------*/

const CHECKBOX_ITEM_NAME = 'DropdownMenuCheckboxItem';

type DropdownMenuCheckboxItemElement = React.ElementRef<typeof MenuPrimitive.CheckboxItem>;
type MenuCheckboxItemProps = Radix.ComponentPropsWithoutRef<typeof MenuPrimitive.CheckboxItem>;
interface DropdownMenuCheckboxItemProps extends MenuCheckboxItemProps {}

const DropdownMenuCheckboxItem = React.forwardRef<
  DropdownMenuCheckboxItemElement,
  DropdownMenuCheckboxItemProps
>((props: ScopedProps<DropdownMenuCheckboxItemProps>, forwardedRef) => {
  const { __scopeDropdownMenu, ...checkboxItemProps } = props;
  const menuScope = useMenuScope(__scopeDropdownMenu);
  return <MenuPrimitive.CheckboxItem {...menuScope} {...checkboxItemProps} ref={forwardedRef} />;
});

DropdownMenuCheckboxItem.displayName = CHECKBOX_ITEM_NAME;

/* -------------------------------------------------------------------------------------------------
 * DropdownMenuRadioGroup
 * -----------------------------------------------------------------------------------------------*/

const RADIO_GROUP_NAME = 'DropdownMenuRadioGroup';

type DropdownMenuRadioGroupElement = React.ElementRef<typeof MenuPrimitive.RadioGroup>;
type MenuRadioGroupProps = Radix.ComponentPropsWithoutRef<typeof MenuPrimitive.RadioGroup>;
interface DropdownMenuRadioGroupProps extends MenuRadioGroupProps {}

const DropdownMenuRadioGroup = React.forwardRef<
  DropdownMenuRadioGroupElement,
  DropdownMenuRadioGroupProps
>((props: ScopedProps<DropdownMenuRadioGroupProps>, forwardedRef) => {
  const { __scopeDropdownMenu, ...radioGroupProps } = props;
  const menuScope = useMenuScope(__scopeDropdownMenu);
  return <MenuPrimitive.RadioGroup {...menuScope} {...radioGroupProps} ref={forwardedRef} />;
});

DropdownMenuRadioGroup.displayName = RADIO_GROUP_NAME;

/* -------------------------------------------------------------------------------------------------
 * DropdownMenuRadioItem
 * -----------------------------------------------------------------------------------------------*/

const RADIO_ITEM_NAME = 'DropdownMenuRadioItem';

type DropdownMenuRadioItemElement = React.ElementRef<typeof MenuPrimitive.RadioItem>;
type MenuRadioItemProps = Radix.ComponentPropsWithoutRef<typeof MenuPrimitive.RadioItem>;
interface DropdownMenuRadioItemProps extends MenuRadioItemProps {}

const DropdownMenuRadioItem = React.forwardRef<
  DropdownMenuRadioItemElement,
  DropdownMenuRadioItemProps
>((props: ScopedProps<DropdownMenuRadioItemProps>, forwardedRef) => {
  const { __scopeDropdownMenu, ...radioItemProps } = props;
  const menuScope = useMenuScope(__scopeDropdownMenu);
  return <MenuPrimitive.RadioItem {...menuScope} {...radioItemProps} ref={forwardedRef} />;
});

DropdownMenuRadioItem.displayName = RADIO_ITEM_NAME;

/* -------------------------------------------------------------------------------------------------
 * DropdownMenuItemIndicator
 * -----------------------------------------------------------------------------------------------*/

const INDICATOR_NAME = 'DropdownMenuItemIndicator';

type DropdownMenuItemIndicatorElement = React.ElementRef<typeof MenuPrimitive.ItemIndicator>;
type MenuItemIndicatorProps = Radix.ComponentPropsWithoutRef<typeof MenuPrimitive.ItemIndicator>;
interface DropdownMenuItemIndicatorProps extends MenuItemIndicatorProps {}

const DropdownMenuItemIndicator = React.forwardRef<
  DropdownMenuItemIndicatorElement,
  DropdownMenuItemIndicatorProps
>((props: ScopedProps<DropdownMenuItemIndicatorProps>, forwardedRef) => {
  const { __scopeDropdownMenu, ...itemIndicatorProps } = props;
  const menuScope = useMenuScope(__scopeDropdownMenu);
  return <MenuPrimitive.ItemIndicator {...menuScope} {...itemIndicatorProps} ref={forwardedRef} />;
});

DropdownMenuItemIndicator.displayName = INDICATOR_NAME;

/* -------------------------------------------------------------------------------------------------
 * DropdownMenuSeparator
 * -----------------------------------------------------------------------------------------------*/

const SEPARATOR_NAME = 'DropdownMenuSeparator';

type DropdownMenuSeparatorElement = React.ElementRef<typeof MenuPrimitive.Separator>;
type MenuSeparatorProps = Radix.ComponentPropsWithoutRef<typeof MenuPrimitive.Separator>;
interface DropdownMenuSeparatorProps extends MenuSeparatorProps {}

const DropdownMenuSeparator = React.forwardRef<
  DropdownMenuSeparatorElement,
  DropdownMenuSeparatorProps
>((props: ScopedProps<DropdownMenuSeparatorProps>, forwardedRef) => {
  const { __scopeDropdownMenu, ...separatorProps } = props;
  const menuScope = useMenuScope(__scopeDropdownMenu);
  return <MenuPrimitive.Separator {...menuScope} {...separatorProps} ref={forwardedRef} />;
});

DropdownMenuSeparator.displayName = SEPARATOR_NAME;

/* -------------------------------------------------------------------------------------------------
 * DropdownMenuArrow
 * -----------------------------------------------------------------------------------------------*/

const ARROW_NAME = 'DropdownMenuArrow';

type DropdownMenuArrowElement = React.ElementRef<typeof MenuPrimitive.Arrow>;
type MenuArrowProps = Radix.ComponentPropsWithoutRef<typeof MenuPrimitive.Arrow>;
interface DropdownMenuArrowProps extends MenuArrowProps {}

const DropdownMenuArrow = React.forwardRef<DropdownMenuArrowElement, DropdownMenuArrowProps>(
  (props: ScopedProps<DropdownMenuArrowProps>, forwardedRef) => {
    const { __scopeDropdownMenu, ...arrowProps } = props;
    const menuScope = useMenuScope(__scopeDropdownMenu);
    return <MenuPrimitive.Arrow {...menuScope} {...arrowProps} ref={forwardedRef} />;
  }
);

DropdownMenuArrow.displayName = ARROW_NAME;

/* -----------------------------------------------------------------------------------------------*/

const Root = DropdownMenu;
const Sub = DropdownMenuSub;
const Trigger = DropdownMenuTrigger;
const SubTrigger = DropdownMenuSubTrigger;
const Content = DropdownMenuContent;
const Group = DropdownMenuGroup;
const Label = DropdownMenuLabel;
const Item = DropdownMenuItem;
const CheckboxItem = DropdownMenuCheckboxItem;
const RadioGroup = DropdownMenuRadioGroup;
const RadioItem = DropdownMenuRadioItem;
const ItemIndicator = DropdownMenuItemIndicator;
const Separator = DropdownMenuSeparator;
const Arrow = DropdownMenuArrow;

export {
  createDropdownMenuScope,
  //
  DropdownMenu,
  DropdownMenuSub,
  DropdownMenuTrigger,
  DropdownMenuSubTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuItemIndicator,
  DropdownMenuSeparator,
  DropdownMenuArrow,
  //
  Root,
  Sub,
  Trigger,
  SubTrigger,
  Content,
  Group,
  Label,
  Item,
  CheckboxItem,
  RadioGroup,
  RadioItem,
  ItemIndicator,
  Separator,
  Arrow,
};
export type {
  DropdownMenuProps,
  DropdownMenuSubProps,
  DropdownMenuTriggerProps,
  DropdownMenuSubTriggerProps,
  DropdownMenuContentProps,
  DropdownMenuGroupProps,
  DropdownMenuLabelProps,
  DropdownMenuItemProps,
  DropdownMenuCheckboxItemProps,
  DropdownMenuRadioGroupProps,
  DropdownMenuRadioItemProps,
  DropdownMenuItemIndicatorProps,
  DropdownMenuSeparatorProps,
  DropdownMenuArrowProps,
};
