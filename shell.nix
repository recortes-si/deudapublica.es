{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  name = "deudapublica-web";

  packages = with pkgs; [
    nodejs_22
    python3
    git
  ];

  shellHook = ''
    export NPM_CONFIG_UPDATE_NOTIFIER=false
    export NPM_CONFIG_FUND=false

    echo "deudapublica.es"
    echo "  npm run dev    Servidor local en http://localhost:8080"
    echo "  npm run build  Genera ./public"
  '';
}
