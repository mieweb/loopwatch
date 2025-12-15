# Contributing to @mieweb/loopwatch

Thank you for your interest in contributing to the Node.js Event Loop Watchdog project! This document provides guidelines and instructions for contributing.

## Code of Conduct

Be respectful and professional in all interactions. We're here to build great software together.

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/loopwatch.git
   cd loopwatch
   ```
3. **Install dependencies**:
   ```bash
   npm install
   ```
4. **Create a branch** for your changes:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## Development Workflow

### Building

```bash
npm run build
```

This compiles TypeScript to JavaScript in the `dist/` directory.

### Testing

```bash
npm test
```

Run tests with coverage:
```bash
npm test -- --coverage
```

### Linting

```bash
npm run lint
```

Fix auto-fixable issues:
```bash
npm run lint:fix
```

### Running Examples

```bash
npm run build
node examples/basic.js
node examples/express-prometheus.js
```

## Making Changes

### Code Style

- Follow existing code patterns
- Use TypeScript for all source code
- Add JSDoc comments for public APIs
- Keep functions small and focused (KISS principle)
- Avoid code duplication (DRY principle)

### Commit Messages

Use clear, descriptive commit messages:

```
Add feature for custom metric prefixes

- Implement prefix configuration option
- Update documentation
- Add tests for prefix functionality
```

### Pull Request Process

1. **Update tests** - Add tests for new functionality
2. **Update documentation** - Update README and inline docs
3. **Run all checks**:
   ```bash
   npm run build
   npm run lint
   npm test
   ```
4. **Create a PR** with a clear description
5. **Address review feedback** promptly

## What to Contribute

### Good First Issues

- Documentation improvements
- Example enhancements
- Test coverage improvements
- Bug fixes

### Feature Additions

Please open an issue first to discuss:
- New configuration options
- Additional metrics
- Integration with other systems
- Performance optimizations

## Testing Guidelines

### Unit Tests

- Test each function/method independently
- Mock external dependencies (perf_hooks, prom-client, etc.)
- Use descriptive test names
- Aim for >70% coverage

### Integration Tests

- Test real-world scenarios
- Verify metric emission
- Test threshold detection accuracy
- Validate error handling

### Example Test

```typescript
describe('EventLoopWatchdog', () => {
  it('should detect sustained backpressure', () => {
    const onWarning = jest.fn();
    const watchdog = new EventLoopWatchdog({
      lagP95WarnMs: 50,
      consecutive: 3,
      onWarning,
    });
    
    watchdog.start();
    // ... trigger backpressure
    
    expect(onWarning).toHaveBeenCalled();
    watchdog.stop();
  });
});
```

## Documentation Guidelines

- Keep README.md up to date
- Add examples for new features
- Include TypeScript type definitions
- Explain "why" not just "what"
- Add troubleshooting guidance

## Performance Considerations

This package must be production-safe:

- **<1% CPU overhead** - Profile changes under load
- **Minimal allocations** - Avoid creating objects in hot paths
- **No blocking operations** - Keep everything async
- **Memory efficient** - No leaks or unbounded growth

## Security

- Never log sensitive data
- Validate all configuration inputs
- Follow secure coding practices
- Report security issues privately to maintainers

## Questions?

Open an issue for:
- Clarification on requirements
- Design discussions
- Implementation questions

## License

By contributing, you agree that your contributions will be licensed under the Apache-2.0 License.

## Recognition

Contributors will be recognized in release notes and the project README.

Thank you for contributing! 🎉
