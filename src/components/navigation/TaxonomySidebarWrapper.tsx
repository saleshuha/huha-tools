import React from 'react';
import { NavLink, NavLinkProps } from 'react-router-dom';
import { useTaxonomy } from '@/hooks/useTaxonomy';
import { TaxonomyCategory } from '@/types/taxonomy';

interface TrackedNavLinkProps extends Omit<NavLinkProps, 'onClick'> {
  category: TaxonomyCategory;
  subcategory: string;
  itemName: string;
  itemHierarchy?: string[]; // e.g., ['Amazon', 'PO Tracker']
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}

/**
 * NavLink wrapper that tracks navigation clicks in taxonomy system
 * Use this instead of NavLink in AppSidebar for automatic tracking
 */
export const TrackedNavLink: React.FC<TrackedNavLinkProps> = ({
  category,
  subcategory,
  itemName,
  itemHierarchy = [],
  onClick,
  children,
  to,
  ...props
}) => {
  const { trackAction } = useTaxonomy();

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Track the navigation
    trackAction({
      category,
      subcategory,
      actionName: 'sidebar_navigation',
      actionType: 'navigation',
      metadata: {
        item_name: itemName,
        destination: typeof to === 'string' ? to : to.pathname,
        hierarchy: itemHierarchy,
        timestamp: new Date().toISOString()
      }
    });

    // Call original onClick if provided
    onClick?.(e);
  };

  return (
    <NavLink to={to} onClick={handleClick} {...props}>
      {children}
    </NavLink>
  );
};

interface TrackedButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  category: TaxonomyCategory;
  subcategory: string;
  actionName: string;
  metadata?: Record<string, any>;
}

/**
 * Button wrapper for tracking sidebar collapsible/accordion actions
 */
export const TrackedSidebarButton: React.FC<TrackedButtonProps> = ({
  category,
  subcategory,
  actionName,
  metadata = {},
  onClick,
  children,
  ...props
}) => {
  const { trackAction } = useTaxonomy();

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    trackAction({
      category,
      subcategory,
      actionName,
      actionType: 'interaction',
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString()
      }
    });

    onClick?.(e);
  };

  return (
    <button onClick={handleClick} {...props}>
      {children}
    </button>
  );
};
