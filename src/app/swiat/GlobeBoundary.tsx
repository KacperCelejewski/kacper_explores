"use client";

import { Component, type ReactNode } from "react";

interface Props {
  onError: () => void;
  children: ReactNode;
}

interface State {
  failed: boolean;
}

// Błąd przy tworzeniu kontekstu WebGL albo ładowaniu fragmentu z globusem nie może wywrócić całej strony
export default class GlobeBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(): void {
    this.props.onError();
  }

  render(): ReactNode {
    return this.state.failed ? null : this.props.children;
  }
}
