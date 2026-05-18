export const canvasCodeTemplates = {
  basicUsage: `<script lang="ts">
  import { Canvas } from '$lib/base/canvas';
  import type { ComponentDef } from '$lib/base/canvas/types';

  const components: ComponentDef[] = [
    {
      id: 'container',
      type: 'View',
      props: {
        padding: '1rem',
        background: 'var(--card)',
        borderRadius: '0.5rem',
        border: '1px solid var(--border)'
      },
      children: [
        {
          id: 'title',
          type: 'Text',
          props: {
            variant: 'h3',
            text: 'Welcome to StudioCanvas'
          }
        }
      ]
    }
  ];
</script>

<Canvas {components} />`,

  customComponents: `<script lang="ts">
  import { Canvas } from '$lib/base/canvas';
  import type { ComponentDef } from '$lib/base/canvas/types';
  import { SvelteMap } from 'svelte/reactivity';
  import type { Component } from 'svelte';
  import MyCustomComponent from './MyCustomComponent.svelte';

  const customComponents = new SvelteMap<string, Component>();
  customComponents.set('MyCustom', MyCustomComponent);

  const components: ComponentDef[] = [
    {
      id: 'custom',
      type: 'MyCustom',
      props: {
        message: 'Hello from custom component!',
        variant: 'primary'
      }
    }
  ];
</script>

<Canvas {components} {customComponents} />`,

  layoutStructure: `<script lang="ts">
  import { Canvas } from '$lib/base/canvas';
  import type { ComponentDef } from '$lib/base/canvas/types';

  const layoutComponents: ComponentDef[] = [
    {
      id: 'header',
      type: 'View',
      props: {
        padding: '1rem 1.5rem',
        background: 'var(--primary)',
        color: 'var(--primary-foreground)',
        borderRadius: '0.5rem 0.5rem 0 0'
      },
      children: [
        {
          id: 'header-title',
          type: 'Text',
          props: {
            variant: 'h4',
            text: 'Application Header'
          }
        }
      ]
    },
    {
      id: 'main-content',
      type: 'View',
      props: {
        display: 'flex',
        gap: '1rem',
        padding: '1rem 1.5rem',
        background: 'var(--card)',
        borderRadius: '0 0 0.5rem 0.5rem',
        border: '1px solid var(--border)'
      },
      children: [
        {
          id: 'sidebar',
          type: 'View',
          props: {
            width: '200px',
            padding: '1rem',
            background: 'var(--muted)',
            borderRadius: '0.25rem'
          },
          children: [
            {
              id: 'nav-title',
              type: 'Text',
              props: {
                variant: 'h5',
                text: 'Navigation'
              }
            }
          ]
        },
        {
          id: 'content-area',
          type: 'View',
          props: {
            flex: '1',
            padding: '1rem'
          },
          children: [
            {
              id: 'content-title',
              type: 'Text',
              props: {
                variant: 'h5',
                text: 'Main Content'
              }
            }
          ]
        }
      ]
    }
  ];
</script>

<Canvas components={layoutComponents} />`,

  interactiveForm: `<script lang="ts">
  import { Canvas } from '$lib/base/canvas';
  import type { ComponentDef } from '$lib/base/canvas/types';

  const formComponents: ComponentDef[] = [
    {
      id: 'form-container',
      type: 'View',
      props: {
        padding: '1.5rem',
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: '0.75rem',
        maxWidth: '400px'
      },
      children: [
        {
          id: 'form-title',
          type: 'Text',
          props: {
            variant: 'h4',
            text: 'Contact Form',
            marginBottom: '1rem'
          }
        },
        {
          id: 'form-description',
          type: 'Text',
          props: {
            variant: 'p',
            text: 'Fill out the form below to get in touch.',
            color: 'var(--muted-foreground)',
            marginBottom: '1.5rem'
          }
        },
        {
          id: 'button-group',
          type: 'View',
          props: {
            display: 'flex',
            gap: '0.75rem'
          },
          children: [
            {
              id: 'submit-btn',
              type: 'Button',
              props: {
                variant: 'default',
                text: 'Submit Form'
              }
            },
            {
              id: 'cancel-btn',
              type: 'Button',
              props: {
                variant: 'outline',
                text: 'Cancel'
              }
            }
          ]
        }
      ]
    }
  ];
</script>

<Canvas components={formComponents} />`,

  gridLayout: `<script lang="ts">
  import { Canvas } from '$lib/base/canvas';
  import type { ComponentDef } from '$lib/base/canvas/types';

  const gridComponents: ComponentDef[] = [
    {
      id: 'grid-container',
      type: 'View',
      props: {
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '1rem',
        padding: '1rem'
      },
      // Generate 6 grid items dynamically
      children: Array.from({ length: 6 }, (_, i) => ({
        id: \`grid-item-\${i + 1}\`,
        type: 'View',
        props: {
          padding: '1rem',
          background: 'var(--accent)',
          borderRadius: '0.5rem',
          textAlign: 'center'
        },
        children: [
          {
            id: \`grid-text-\${i + 1}\`,
            type: 'Text',
            props: {
              variant: 'p',
              text: \`Item \${i + 1}\`,
              fontWeight: '600'
            }
          }
        ]
      }))
    }
  ];
</script>

<Canvas components={gridComponents} />`,

  dashboardExample: `<script lang="ts">
  import { Canvas } from '$lib/base/canvas';
  import type { ComponentDef } from '$lib/base/canvas/types';

  const dashboardComponents: ComponentDef[] = [
    {
      id: 'dashboard',
      type: 'View',
      props: {
        padding: '1rem',
        background: 'var(--background)'
      },
      children: [
        {
          id: 'dashboard-header',
          type: 'View',
          props: {
            display: 'flex',
            justifyContent: 'between',
            alignItems: 'center',
            marginBottom: '1.5rem',
            padding: '1rem',
            background: 'var(--card)',
            borderRadius: '0.5rem',
            border: '1px solid var(--border)'
          },
          children: [
            {
              id: 'dashboard-title',
              type: 'Text',
              props: {
                variant: 'h3',
                text: 'Dashboard'
              }
            },
            {
              id: 'user-actions',
              type: 'View',
              props: {
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              },
              children: [
                {
                  id: 'user-name',
                  type: 'Text',
                  props: {
                    variant: 'small',
                    text: 'John Doe'
                  }
                },
                {
                  id: 'logout-btn',
                  type: 'Button',
                  props: {
                    variant: 'outline',
                    text: 'Logout'
                  }
                }
              ]
            }
          ]
        },
        {
          id: 'stats-grid',
          type: 'View',
          props: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '1rem'
          },
          children: [
            {
              id: 'users-stat',
              type: 'View',
              props: {
                padding: '1.5rem',
                background: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: '0.75rem'
              },
              children: [
                {
                  id: 'users-label',
                  type: 'Text',
                  props: {
                    variant: 'small',
                    text: 'Total Users',
                    color: 'var(--muted-foreground)',
                    marginBottom: '0.5rem'
                  }
                },
                {
                  id: 'users-value',
                  type: 'Text',
                  props: {
                    variant: 'h2',
                    text: '1,234',
                    fontWeight: '700'
                  }
                }
              ]
            },
            {
              id: 'revenue-stat',
              type: 'View',
              props: {
                padding: '1.5rem',
                background: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: '0.75rem'
              },
              children: [
                {
                  id: 'revenue-label',
                  type: 'Text',
                  props: {
                    variant: 'small',
                    text: 'Revenue',
                    color: 'var(--muted-foreground)',
                    marginBottom: '0.5rem'
                  }
                },
                {
                  id: 'revenue-value',
                  type: 'Text',
                  props: {
                    variant: 'h2',
                    text: '$12,345',
                    fontWeight: '700'
                  }
                }
              ]
            }
          ]
        }
      ]
    }
  ];
</script>

<Canvas components={dashboardComponents} />`,

  errorHandling: `<script lang="ts">
  import { Canvas } from '$lib/base/canvas';
  import type { ComponentDef } from '$lib/base/canvas/types';

  // StudioCanvas gracefully handles invalid components
  const componentsWithErrors: ComponentDef[] = [
    {
      id: 'valid-component',
      type: 'View',
      props: {
        padding: '1rem',
        background: 'var(--card)',
        borderRadius: '0.5rem',
        marginBottom: '1rem'
      },
      children: [
        {
          id: 'valid-text',
          type: 'Text',
          props: {
            variant: 'p',
            text: 'This component renders successfully.'
          }
        }
      ]
    },
    {
      id: 'invalid-component',
      type: 'NonExistentComponent', // This will show error message
      props: {
        someProp: 'value'
      }
    },
    {
      id: 'malformed-component',
      type: '', // This will also show error message
      props: {}
    }
  ];
</script>

<Canvas components={componentsWithErrors} />`,

  withRenderFunction: `<script lang="ts">
  import { Canvas } from '$lib/base/canvas';
  import type { ComponentDef, RenderComponentFn } from '$lib/base/canvas/types';

  // Custom render function for advanced use cases
  const customRender: RenderComponentFn = (component, props, children) => {
    // Add custom logic here, like logging or validation
    console.log('Rendering component:', component.type, props);

    // Return null to use default rendering
    return null;
  };

  const components: ComponentDef[] = [
    {
      id: 'monitored-component',
      type: 'View',
      props: {
        padding: '1rem',
        background: 'var(--card)'
      },
      children: [
        {
          id: 'monitored-text',
          type: 'Text',
          props: {
            text: 'This component is being monitored via custom render function'
          }
        }
      ]
    }
  ];
</script>

<Canvas {components} renderComponent={customRender} />`,

  dynamicComponents: `<script lang="ts">
  import { Canvas } from '$lib/base/canvas';
  import type { ComponentDef } from '$lib/base/canvas/types';

  let componentCount = 1;

  // Reactive component definitions
  $: dynamicComponents: ComponentDef[] = Array.from({ length: componentCount }, (_, i) => ({
    id: \`dynamic-\${i + 1}\`,
    type: 'View',
    props: {
      padding: '1rem',
      margin: '0.5rem 0',
      background: 'var(--accent)',
      borderRadius: '0.5rem'
    },
    children: [
      {
        id: \`text-\${i + 1}\`,
        type: 'Text',
        props: {
          text: \`Dynamic Component \${i + 1}\`
        }
      }
    ]
  }));

  const addComponent = () => componentCount++;
  const removeComponent = () => componentCount = Math.max(1, componentCount - 1);
</script>

<div>
  <div style="margin-bottom: 1rem;">
    <button on:click={addComponent}>Add Component</button>
    <button on:click={removeComponent}>Remove Component</button>
  </div>

  <Canvas components={dynamicComponents} />
</div>`,

  typeScriptDefinitions: `// TypeScript Interface Definitions

interface ComponentDef {
  id?: string;                    // Optional unique identifier
  type: string;                   // Component type (must exist in registry)
  props?: Record<string, any>;    // Props to pass to the component
  children?: ComponentDef[];      // Nested child components
}

type RenderComponentFn = (
  component: ComponentDef,
  props: Record<string, any>,
  children?: any[]
) => any | null;

// Built-in components registry
const DEFAULT_COMPONENTS = new Map([
  ['View', BoxComponent],
  ['Text', TextComponent],
  ['Button', ButtonComponent]
]);

// Custom components registration
import { SvelteMap } from 'svelte/reactivity';
import type { Component } from 'svelte';

const customComponents = new SvelteMap<string, Component>();
customComponents.set('MyComponent', MyCustomComponent);`,
};
