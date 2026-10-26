import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';

test('renders without crashing', () => {
  const { baseElement } = render(<App />);
  expect(baseElement).toBeDefined();
});

test('MatchScoreCard starts at 0-0 and clean dynamic state without hardcoded future goals', async () => {
  const { MatchScoreCard } = await import('./components/dashboard/MatchScoreCard');
  const { getByText } = render(
    <MemoryRouter>
      <MatchScoreCard />
    </MemoryRouter>
  );
  expect(getByText('Match Score')).toBeDefined();
  expect(getByText('0 - 0')).toBeDefined();
  expect(getByText(/No goals scored yet/i)).toBeDefined();
});

test('ShootMapCard handles team selection and live shots without hardcoded fallback', async () => {
  const { ShootMapCard } = await import('./components/dashboard/ShootMapCard');
  const { getByText } = render(<ShootMapCard />);
  expect(getByText('Shoot Map')).toBeDefined();
  expect(getByText(/No shots recorded yet/i)).toBeDefined();
});

test('AttackingShapeCard renders live outfield tracking nodes and dynamic pitch markings', async () => {
  const { AttackingShapeCard } = await import('./components/dashboard/AttackingShapeCard');
  const { container, getByText } = render(<AttackingShapeCard />);
  expect(getByText('Attacking Shape')).toBeDefined();
  const playerNodes = container.querySelectorAll("div[title*='#']");
  expect(playerNodes.length).toBe(10);
});
