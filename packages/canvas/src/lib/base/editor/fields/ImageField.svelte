<script lang="ts">
import Camera from "@lucide/svelte/icons/camera";
import Image from "@lucide/svelte/icons/image";
import Link2 from "@lucide/svelte/icons/link-2";
import Upload from "@lucide/svelte/icons/upload";
import X from "@lucide/svelte/icons/x";
import * as Button from "$lib/base/button/index.js";
import * as Input from "$lib/components/view-ui/input/index.js";
import * as Label from "$lib/components/view-ui/label/index.js";
import * as Progress from "$lib/components/view-ui/progress/index.js";
import * as Tabs from "$lib/components/view-ui/tabs/index.js";
import { cn } from "$lib/utils.js";
import type { ImageFieldConfig, ImageValue } from "../types.js";

let {
	name,
	config,
	value = "" as string | ImageValue,
	onChange,
}: {
	name: string;
	config: ImageFieldConfig;
	value?: string | ImageValue;
	onChange?: (value: string | ImageValue) => void;
} = $props();

// Local state
let imageValue = $state(parseImageValue(value));
let isPreviewVisible = $state(false);
let uploadProgress = $state(0);

// Initialize preview visibility based on image value
$effect(() => {
	isPreviewVisible = !!imageValue.src;
});
let uploadError = $state("");
let activeTab = $state("url"); // 'url' or 'upload'
let isDragging = $state(false);

// Input reference
let fileInput = $state<HTMLInputElement | null>(null);

// Initialize local state
function parseImageValue(value: string | ImageValue): ImageValue {
	if (typeof value === "string") {
		return { src: value };
	}
	if (value && typeof value === "object") {
		return { ...value };
	}

	return { src: "" };
}

// Handle URL change
function handleUrlChange(event: Event) {
	const target = event.target as HTMLInputElement;

	imageValue = {
		...imageValue,
		src: target.value,
	};
	isPreviewVisible = !!target.value;

	if (onChange) {
		onChange(imageValue);
	}
}

// Handle alt text change
function handleAltChange(event: Event) {
	const target = event.target as HTMLInputElement;

	imageValue = {
		...imageValue,
		alt: target.value,
	};

	if (onChange) {
		onChange(imageValue);
	}
}

// Handle tab change
function handleTabChange(tab: string) {
	activeTab = tab;
}

// Open file selector
function openFileSelector() {
	if (fileInput) {
		fileInput.click();
	}
}

// Handle file selection
function handleFileSelect(event: Event) {
	const target = event.target as HTMLInputElement;

	if (target.files && target.files.length > 0) {
		const file = target.files[0];
		handleFileUpload(file);
	}
}

// Handle file drag over
function handleDragOver(event: DragEvent) {
	event.preventDefault();
	isDragging = true;
}

// Handle file drag leave
function handleDragLeave(event: DragEvent) {
	event.preventDefault();
	isDragging = false;
}

// Handle file drop
function handleDrop(event: DragEvent) {
	event.preventDefault();
	isDragging = false;

	if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
		const file = event.dataTransfer.files[0];
		handleFileUpload(file);
	}
}

// Validate file
function validateFile(file: File): { valid: boolean; error?: string } {
	// Check file size
	if (config.maxSize && file.size > config.maxSize) {
		const maxSizeMB = (config.maxSize / (1024 * 1024)).toFixed(2);
		return {
			valid: false,
			error: `File size exceeds maximum allowed size (${maxSizeMB} MB)`,
		};
	}

	// Check file type
	if (config.allowedTypes && config.allowedTypes.length > 0) {
		const fileType = file.type;
		const fileExtension = file.name.split(".").pop()?.toLowerCase();

		const isValidType = config.allowedTypes.some((type) => {
			// Check MIME type
			if (fileType === type) return true;

			// Check file extension (handle formats like "image/jpeg" or ".jpg")
			const typeExtension = type.startsWith(".")
				? type.toLowerCase()
				: `.${type.split("/").pop()?.toLowerCase()}`;

			return fileExtension === typeExtension.replace(".", "");
		});

		if (!isValidType) {
			return {
				valid: false,
				error: `Unsupported file type. Allowed types: ${config.allowedTypes.join(", ")}`,
			};
		}
	}

	return { valid: true };
}

// Handle file upload
function handleFileUpload(file: File) {
	// Validate file
	const validation = validateFile(file);
	if (!validation.valid) {
		uploadError = validation.error || "Invalid file";
		return;
	}

	// Reset state
	uploadError = "";
	uploadProgress = 0;

	// For demo purposes, simulate upload with a timeout
	// In a real app, you would use fetch or another API to upload the file
	const interval = setInterval(() => {
		uploadProgress += 10;

		if (uploadProgress >= 100) {
			clearInterval(interval);

			// Create object URL for preview
			const objectUrl = URL.createObjectURL(file);

			// Update image value
			imageValue = {
				...imageValue,
				src: objectUrl,
				width: undefined,
				height: undefined,
			};

			isPreviewVisible = true;

			// Load image to get dimensions
			const img = new globalThis.Image();
			img.onload = () => {
				imageValue = {
					...imageValue,
					width: img.width,
					height: img.height,
				};

				if (onChange) {
					onChange(imageValue);
				}
			};
			img.src = objectUrl;

			if (onChange) {
				onChange(imageValue);
			}
		}
	}, 100);
}

// Clear image
function clearImage() {
	imageValue = { src: "" };
	isPreviewVisible = false;
	uploadProgress = 0;
	uploadError = "";

	if (onChange) {
		onChange(imageValue);
	}
}

// Format allowed types for display
function formatAllowedTypes(): string {
	if (!config.allowedTypes || config.allowedTypes.length === 0) {
		return "All image files";
	}

	return config.allowedTypes
		.map((type) => type.replace("image/", "").toUpperCase())
		.join(", ");
}

// Format max size for display
function formatMaxSize(): string {
	if (!config.maxSize) {
		return "No size limit";
	}

	const sizeMB = (config.maxSize / (1024 * 1024)).toFixed(2);
	return `Max ${sizeMB} MB`;
}
</script>

<div class="space-y-2">
  <Label.Root for={name} class="text-sm font-medium">
    {config.label}
    {#if config.required}
      <span class="text-destructive ml-1">*</span>
    {/if}
  </Label.Root>

  {#if config.description}
    <p class="text-muted-foreground text-xs">{config.description}</p>
  {/if}

  {#if isPreviewVisible && imageValue.src}
    <div class="image-preview group relative overflow-hidden rounded-md border">
      <img
        src={imageValue.src}
        alt={imageValue.alt || ""}
        class="mx-auto max-h-40 w-auto object-contain"
      />

      {#if imageValue.width && imageValue.height}
        <div
          class="bg-background/80 absolute bottom-1 left-1 rounded px-1.5 py-0.5 text-xs"
        >
          {imageValue.width} × {imageValue.height}
        </div>
      {/if}

      <Button.Root
        variant="destructive"
        size="icon"
        class="absolute top-1 right-1 h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
        onclick={clearImage}
      >
        <X class="h-3 w-3" />
      </Button.Root>
    </div>
  {:else}
    <Tabs.Root value={activeTab} onValueChange={handleTabChange}>
      <Tabs.List class="grid grid-cols-2">
        <Tabs.Trigger
          value="url"
          class="flex items-center justify-center gap-1.5"
        >
          <Link2 class="h-3.5 w-3.5" />
          <span>URL</span>
        </Tabs.Trigger>
        <Tabs.Trigger
          value="upload"
          class="flex items-center justify-center gap-1.5"
        >
          <Upload class="h-3.5 w-3.5" />
          <span>Upload</span>
        </Tabs.Trigger>
      </Tabs.List>

      <div class="pt-2">
        <Tabs.Content value="url" class="space-y-2">
          <div class="relative">
            <Input.Root
              id={name}
              type="text"
              value={imageValue.src}
              oninput={handleUrlChange}
              placeholder="https://example.com/image.jpg"
              class="pl-8"
            />
            <div class="absolute top-1/2 left-2 -translate-y-1/2">
              <Image class="text-muted-foreground h-4 w-4" />
            </div>
          </div>
        </Tabs.Content>

        <Tabs.Content value="upload" class="space-y-2">
          <!-- File upload area -->
          <div
            class={cn(
              "cursor-pointer rounded-md border-2 border-dashed p-4 text-center transition-colors",
              isDragging
                ? "border-primary bg-primary/5"
                : "border-muted hover:border-muted-foreground/50"
            )}
            onclick={openFileSelector}
            ondragover={handleDragOver}
            ondragleave={handleDragLeave}
            ondrop={handleDrop}
            role="button"
            tabindex="0"
            onkeydown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                openFileSelector();
              }
            }}
          >
            <input
              type="file"
              accept={config.allowedTypes
                ? config.allowedTypes.join(",")
                : "image/*"}
              class="hidden"
              bind:this={fileInput}
              onchange={handleFileSelect}
            />

            <div class="flex flex-col items-center gap-2 py-2">
              <Camera class="text-muted-foreground h-8 w-8" />
              <div>
                <p class="text-sm font-medium">Click or drag an image here</p>
                <p class="text-muted-foreground mt-1 text-xs">
                  {formatAllowedTypes()} • {formatMaxSize()}
                </p>
              </div>
            </div>
          </div>

          {#if uploadProgress > 0 && uploadProgress < 100}
            <Progress.Progress value={uploadProgress} max={100} />
          {/if}

          {#if uploadError}
            <p class="text-destructive text-xs">{uploadError}</p>
          {/if}
        </Tabs.Content>
      </div>
    </Tabs.Root>
  {/if}

  <div class="space-y-1">
    <Label.Root for={`${name}-alt`} class="text-xs">Alt Text</Label.Root>
    <Input.Root
      id={`${name}-alt`}
      type="text"
      value={imageValue.alt || ""}
      placeholder="Image description"
      oninput={handleAltChange}
    />
  </div>
</div>
