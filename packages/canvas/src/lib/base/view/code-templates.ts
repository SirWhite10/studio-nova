export const viewCodeTemplates = {
  basicUsage: `<script>
  import { View } from "$lib/base/view";
</script>

<View>Basic View component</View>`,

  withStyling: `<View
  padding="1rem"
  background="var(--muted)"
  borderRadius="0.5rem"
  border="1px solid var(--border)"
>
  Styled View with padding and background
</View>`,

  flexboxLayout: `<View
  display="flex"
  gap="1rem"
  padding="1rem"
  alignItems="center"
  justifyContent="between"
>
  <View>Item 1</View>
  <View>Item 2</View>
  <View>Item 3</View>
</View>`,

  gridLayout: `<View
  display="grid"
  gap="1rem"
  padding="1rem"
  style="grid-template-columns: repeat(3, 1fr);"
>
  <View background="var(--accent)" padding="0.5rem">Grid Item 1</View>
  <View background="var(--accent)" padding="0.5rem">Grid Item 2</View>
  <View background="var(--accent)" padding="0.5rem">Grid Item 3</View>
</View>`,

  semanticElements: `<View as="section" padding="2rem">
  <View as="header" margin="0 0 1rem 0">
    <View as="h2">Section Title</View>
  </View>
  <View as="article" padding="1rem" background="var(--card)">
    <View as="p">Content using semantic HTML elements.</View>
  </View>
</View>`,

  cardContainer: `<View
  width="400px"
  padding="1.5rem"
  background="var(--card)"
  border="1px solid var(--border)"
  borderRadius="0.75rem"
  shadow="md"
>
  <View margin="0 0 1rem 0">
    <View style="font-size: 1.25rem; font-weight: 600; margin-bottom: 0.5rem;">
      Card Title
    </View>
    <View color="var(--muted-foreground)">
      Card description with custom styling.
    </View>
  </View>
  <View>Card content goes here.</View>
</View>`,

  gradientBackground: `<View
  width="200px"
  height="100px"
  background="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
  borderRadius="1rem"
  display="flex"
  alignItems="center"
  justifyContent="center"
  color="white"
  style="font-weight: 600;"
>
  Gradient View
</View>`,

  responsiveLayout: `<View
  display="flex"
  flexDirection="column"
  gap="1rem"
  padding="1rem"
  style="flex-direction: row; /* Override on larger screens */"
>
  <View
    background="var(--primary)"
    color="var(--primary-foreground)"
    padding="1rem"
    borderRadius="0.5rem"
  >
    Responsive Item 1
  </View>
  <View
    background="var(--secondary)"
    color="var(--secondary-foreground)"
    padding="1rem"
    borderRadius="0.5rem"
  >
    Responsive Item 2
  </View>
</View>`,

  buttonElement: `<View
  as="button"
  padding="0.5rem 1rem"
  background="var(--primary)"
  color="var(--primary-foreground)"
  border="none"
  borderRadius="0.375rem"
  transition="all 0.2s"
  style="cursor: pointer;"
>
  Button View
</View>`,

  linkElement: `<View
  as="a"
  href="/docs"
  padding="0.5rem 1rem"
  background="var(--accent)"
  color="var(--accent-foreground)"
  borderRadius="0.375rem"
  style="text-decoration: none; display: inline-block;"
>
  Link View
</View>`,

  complexForm: `<View
  as="form"
  display="flex"
  flexDirection="column"
  gap="1rem"
  padding="2rem"
  background="var(--card)"
  border="1px solid var(--border)"
  borderRadius="0.5rem"
  shadow="sm"
>
  <View>
    <View as="label" style="font-weight: 500; margin-bottom: 0.5rem; display: block;">
      Name
    </View>
    <View
      as="input"
      padding="0.5rem"
      border="1px solid var(--border)"
      borderRadius="0.25rem"
      width="100%"
    />
  </View>

  <View>
    <View as="label" style="font-weight: 500; margin-bottom: 0.5rem; display: block;">
      Message
    </View>
    <View
      as="textarea"
      padding="0.5rem"
      border="1px solid var(--border)"
      borderRadius="0.25rem"
      width="100%"
      height="100px"
    />
  </View>

  <View
    as="button"
    padding="0.75rem 1.5rem"
    background="var(--primary)"
    color="var(--primary-foreground)"
    border="none"
    borderRadius="0.375rem"
    style="cursor: pointer; font-weight: 500;"
  >
    Submit
  </View>
</View>`,

  cssVariableCustomization: `<!-- Parent component sets custom variables -->
<View style="--view-primary: #3b82f6; --view-primary-foreground: white;">
  <View
    background="var(--view-primary)"
    color="var(--view-primary-foreground)"
    padding="1rem"
    borderRadius="0.5rem"
  >
    Custom themed content
  </View>
</View>`,

  // New Architecture Features
  eventSystem: `<script>
  import { View } from "$lib/base/view";

  let clickCount = $state(0);

  function handleTap(event) {
    clickCount++;
    console.log('Tap event:', event);
  }

  function handleHover() {
    console.log('Hover started');
  }

  function handleHoverEnd() {
    console.log('Hover ended');
  }
</script>

<!-- Grouped event handlers -->
<View
  padding="0.75rem 1rem"
  background="var(--primary)"
  color="var(--primary-foreground)"
  borderRadius="0.25rem"
  ontap={handleTap}
  onhover={handleHover}
  onhoverend={handleHoverEnd}
  style="cursor: pointer;"
>
  Click me! (Taps: {clickCount})
</View>

<!-- Studio Canvas action integration -->
<View
  padding="0.75rem 1rem"
  background="var(--accent)"
  color="var(--accent-foreground)"
  borderRadius="0.25rem"
  onActionTap="fetch-data"
  actionParams={{ url: '/api/data', method: 'GET' }}
  style="cursor: pointer;"
>
  Action Integration
</View>`,

  stateManagement: `<script>
  import { View } from "$lib/base/view";

  let isDisabled = $state(false);
  let isLoading = $state(false);
  let isSelected = $state(false);
</script>

<!-- Interactive button with state-based styling -->
<View
  padding="0.75rem 1rem"
  background="var(--background)"
  border="2px solid var(--border)"
  borderRadius="0.25rem"
  disabled={isDisabled}
  loading={isLoading}
  selected={isSelected}
  ontap={() => console.log('Button clicked')}
  states={{
    base: {
      transition: 'all 0.2s ease'
    },
    hover: {
      borderColor: 'var(--primary)',
      background: 'var(--primary/10)'
    },
    active: {
      transform: 'scale(0.98)'
    },
    focus: {
      outline: '2px solid var(--ring)',
      outlineOffset: '2px'
    },
    disabled: {
      opacity: 0.5,
      background: 'var(--muted)'
    },
    loading: {
      opacity: 0.6
    },
    selected: {
      background: 'var(--primary)',
      color: 'var(--primary-foreground)',
      borderColor: 'var(--primary)'
    }
  }}
  style="cursor: pointer;"
>
  Interactive Button
</View>

<!-- State toggle controls -->
<View display="flex" gap="0.5rem" margin="1rem 0 0 0">
  <View
    as="button"
    padding="0.5rem"
    background="var(--secondary)"
    border="none"
    borderRadius="0.25rem"
    ontap={() => isDisabled = !isDisabled}
  >
    Toggle Disabled
  </View>
  <View
    as="button"
    padding="0.5rem"
    background="var(--secondary)"
    border="none"
    borderRadius="0.25rem"
    ontap={() => isLoading = !isLoading}
  >
    Toggle Loading
  </View>
  <View
    as="button"
    padding="0.5rem"
    background="var(--secondary)"
    border="none"
    borderRadius="0.25rem"
    ontap={() => isSelected = !isSelected}
  >
    Toggle Selected
  </View>
</View>`,

  themeIntegration: `<script>
  import { View } from "$lib/base/view";

  // Theme variable examples
  let currentTheme = $state('light');

  function toggleTheme() {
    currentTheme = currentTheme === 'light' ? 'dark' : 'light';
  }
</script>

<!-- CSS variables -->
<View
  padding="1rem"
  background="var(--card)"
  color="var(--card-foreground)"
  borderRadius="0.5rem"
  border="1px solid var(--border)"
>
  Using CSS variables
</View>

<!-- Custom theme variables -->
<View
  style="--custom-primary: oklch(0.7 0.15 250); --custom-bg: oklch(0.98 0.02 250);"
>
  <View
    background="var(--custom-bg)"
    border="2px solid var(--custom-primary)"
    borderRadius="0.5rem"
    padding="1rem"
  >
    <View
      background="var(--custom-primary)"
      color="white"
      padding="0.5rem 1rem"
      borderRadius="0.25rem"
      style="display: inline-block;"
    >
      Custom Theme
    </View>
  </View>
</View>

<!-- Theme mode switching -->
<View
  as="button"
  padding="0.5rem 1rem"
  background="var(--muted)"
  border="1px solid var(--border)"
  borderRadius="0.25rem"
  ontap={toggleTheme}
  style="cursor: pointer;"
>
  Toggle Theme ({currentTheme})
</View>`,

  modularArchitecture: `<script>
  import { View } from "$lib/base/view";

  // Custom component state management
  let isClicked = $state(false);

  function handleClick() {
    isClicked = !isClicked;
    console.log('Component clicked:', isClicked);
  }

  function handleHover() {
    console.log('Component hovered');
  }
</script>

<!-- Custom component with dynamic styling -->
<View
  padding="1rem"
  background={isClicked ? 'var(--primary)' : 'var(--muted)'}
  color={isClicked ? 'var(--primary-foreground)' : 'var(--muted-foreground)'}
  borderRadius="0.5rem"
  border="2px solid var(--border)"
  display="flex"
  alignItems="center"
  justifyContent="center"
  ontap={handleClick}
  onhover={handleHover}
  states={{
    hover: { opacity: 0.8 },
    active: { transform: 'scale(0.95)' }
  }}
  style="cursor: pointer; transition: all 0.2s ease;"
>
  {isClicked ? 'Clicked!' : 'Click Me'} Component
</View>

<!-- Complete View component with full configuration -->
<View
  padding="1rem"
  background="var(--primary)"
  color="var(--primary-foreground)"
  borderRadius="0.5rem"
  display="flex"
  alignItems="center"
  justifyContent="center"
  ontap={() => console.log('View component clicked')}
  states={{
    hover: { opacity: 0.8 },
    active: { transform: 'scale(0.95)' }
  }}
  style="cursor: pointer;"
>
  Complete View Component
</View>`,

  performanceOptimization: `<script>
  import { View } from "$lib/base/view";

  // Performance tips:
  // 1. Use conditional rendering for expensive states
  let showComplexState = $state(false);

  // 2. Define common state patterns
  const buttonStates = {
    hover: { opacity: 0.9 },
    active: { transform: 'scale(0.98)' },
    focus: { outline: '2px solid var(--ring)' }
  };

  const cardStates = {
    hover: { transform: 'translateY(-2px)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' },
    active: { transform: 'translateY(0)' }
  };
</script>

<!-- Conditional state rendering -->
<View
  padding="1rem"
  background="var(--card)"
  borderRadius="0.5rem"
  states={showComplexState ? {
    // Complex state object only created when needed
    hover: { transform: 'translateY(-2px)', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' },
    active: { transform: 'translateY(0)' },
    focus: { outline: '2px solid var(--ring)' }
  } : undefined}
  style="cursor: pointer;"
>
  Conditionally optimized states
</View>

<!-- Using predefined state patterns -->
<View
  padding="0.75rem 1rem"
  background="var(--primary)"
  color="var(--primary-foreground)"
  borderRadius="0.25rem"
  states={buttonStates}
  ontap={() => console.log('Button clicked')}
  style="cursor: pointer;"
>
  Button with preset states
</View>

<View
  padding="1.5rem"
  background="var(--card)"
  border="1px solid var(--border)"
  borderRadius="0.5rem"
  states={cardStates}
  style="cursor: pointer;"
>
  Card with preset states
</View>`,

  accessibilityFeatures: `<script>
  import { View } from "$lib/base/view";
</script>

<!-- Semantic button with keyboard support -->
<View
  as="button"
  padding="0.75rem 1rem"
  background="var(--primary)"
  color="var(--primary-foreground)"
  borderRadius="0.25rem"
  border="none"
  ontap={() => console.log('Accessible button clicked')}
  aria-label="Save document"
  states={{
    focus: { outline: '2px solid var(--ring)', outlineOffset: '2px' },
    hover: { opacity: 0.9 }
  }}
  style="cursor: pointer;"
>
  Save Document
</View>

<!-- Semantic navigation -->
<View as="nav" display="flex" gap="1rem" padding="1rem">
  <View
    as="a"
    href="/home"
    padding="0.5rem 1rem"
    borderRadius="0.25rem"
    ontap={(e) => {
      // Custom navigation logic
      e.preventDefault();
      console.log('Navigate to home');
    }}
    states={{
      hover: { background: 'var(--muted)' },
      focus: { outline: '2px solid var(--ring)' }
    }}
    style="text-decoration: none;"
  >
    Home
  </View>
  <View
    as="a"
    href="/about"
    padding="0.5rem 1rem"
    borderRadius="0.25rem"
    ontap={(e) => {
      e.preventDefault();
      console.log('Navigate to about');
    }}
    states={{
      hover: { background: 'var(--muted)' },
      focus: { outline: '2px solid var(--ring)' }
    }}
    style="text-decoration: none;"
  >
    About
  </View>
</View>

<!-- Accessible form with keyboard navigation -->
<View as="form" display="flex" flexDirection="column" gap="1rem">
  <View>
    <View
      as="label"
      for="username"
      display="block"
      margin="0 0 0.5rem 0"
      style="font-weight: 500;"
    >
      Username
    </View>
    <View
      as="input"
      id="username"
      type="text"
      padding="0.5rem"
      border="1px solid var(--border)"
      borderRadius="0.25rem"
      width="100%"
      states={{
        focus: { borderColor: 'var(--ring)', outline: '2px solid var(--ring)' }
      }}
    />
  </View>

  <View
    as="button"
    type="submit"
    padding="0.75rem 1.5rem"
    background="var(--primary)"
    color="var(--primary-foreground)"
    border="none"
    borderRadius="0.25rem"
    ontap={() => console.log('Form submitted')}
    states={{
      hover: { opacity: 0.9 },
      focus: { outline: '2px solid var(--ring)', outlineOffset: '2px' },
      active: { transform: 'translateY(1px)' }
    }}
    style="cursor: pointer;"
  >
    Submit
  </View>
</View>`,
};
