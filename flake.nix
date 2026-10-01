{
  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";

  outputs = inputs: {
    devShells = inputs.nixpkgs.lib.genAttrs [ "x86_64-linux" "aarch64-darwin" ] (system: {
      default = inputs.nixpkgs.legacyPackages.${system}.mkShell {
        packages = with inputs.nixpkgs.legacyPackages.${system}; [
          # Frontend
          nodejs
          pnpm
          # Backend
          python3
          python3Packages.pip
          ruff
        ];

        shellHook = ''
          # Prefer nix installation over pip installation of ruff.
          export RUFF="$(command -v ruff)"

          # Automatically load .venv into the environment.
          export VENV="$PWD/server/.venv"
          [ -d "$VENV" ] || python3 -m venv "$VENV"
          export PATH="$VENV/bin:$PATH"
        '';
      };
    });
  };
}
