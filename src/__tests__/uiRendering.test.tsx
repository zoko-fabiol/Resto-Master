// ============================================================
// src/__tests__/uiRendering.test.tsx
// Tests de non-régression sur le rendu des composants UI et icônes
// ============================================================

import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Button, renderIconNode } from '../components/ui/Button';
import { PageHeader } from '../components/ui/PageHeader';
import { EmptyState } from '../components/ui/EmptyState';
import { Plus, CalendarDays, Inbox } from 'lucide-react';

describe('Composants UI - Rendu des Icônes et Robustesse', () => {
  it('renderIconNode gère correctement une icône Lucide passée comme composant', () => {
    const node = renderIconNode(Plus, 'w-4 h-4');
    expect(React.isValidElement(node)).toBe(true);
    const html = renderToStaticMarkup(node as React.ReactElement);
    expect(html).toContain('svg');
  });

  it('renderIconNode gère correctement un élément JSX pré-instancié', () => {
    const jsx = <Plus className="w-6 h-6 custom" />;
    const node = renderIconNode(jsx, 'w-4 h-4');
    expect(node).toBe(jsx);
    const html = renderToStaticMarkup(node as React.ReactElement);
    expect(html).toContain('w-6 h-6 custom');
  });

  it('renderIconNode gère null et undefined sans lever derreur', () => {
    expect(renderIconNode(null)).toBeNull();
    expect(renderIconNode(undefined)).toBeNull();
  });

  it('Button se monte sans erreur avec icon={Plus} (composant forwardRef)', () => {
    const html = renderToStaticMarkup(
      <Button variant="primary" icon={Plus}>
        Ajouter
      </Button>
    );
    expect(html).toContain('Ajouter');
    expect(html).toContain('svg');
  });

  it('Button se monte sans erreur avec leftIcon et rightIcon Lucide', () => {
    const html = renderToStaticMarkup(
      <Button leftIcon={CalendarDays} rightIcon={Plus}>
        Planifier
      </Button>
    );
    expect(html).toContain('Planifier');
    expect(html).toContain('svg');
  });

  it('PageHeader se monte sans erreur avec icon={CalendarDays} en composant', () => {
    const html = renderToStaticMarkup(
      <PageHeader
        title="Événements & Banquets"
        subtitle="Sous-titre descriptif"
        icon={CalendarDays}
      />
    );
    expect(html).toContain('Événements &amp; Banquets');
    expect(html).toContain('svg');
  });

  it('PageHeader se monte sans erreur avec icon JSX instancié', () => {
    const html = renderToStaticMarkup(
      <PageHeader
        title="Vue Tables"
        icon={<CalendarDays className="w-5 h-5" />}
      />
    );
    expect(html).toContain('Vue Tables');
    expect(html).toContain('w-5 h-5');
  });

  it('EmptyState se monte sans erreur avec icon={Inbox}', () => {
    const html = renderToStaticMarkup(
      <EmptyState
        title="Aucun résultat"
        icon={Inbox}
        actionLabel="Créer"
        onAction={() => {}}
      />
    );
    expect(html).toContain('Aucun résultat');
    expect(html).toContain('Créer');
    expect(html).toContain('svg');
  });
});
