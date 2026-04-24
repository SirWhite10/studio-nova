class StudioCreateDialogState {
  open = $state(false);

  openDialog() {
    this.open = true;
  }

  closeDialog() {
    this.open = false;
  }
}

export const studioCreateDialog = new StudioCreateDialogState();
