{ pkgs ? import <nixpkgs> {} }:

pkgs.stdenv.mkDerivation {
  pname = "deudapublica-web";
  version = "0.1.0";

  src = ./.;

  dontConfigure = true;

  nativeBuildInputs = [ pkgs.nodejs_22 ];

  buildPhase = ''
    node scripts/test.mjs
    node scripts/build.mjs "$TMPDIR/public"
  '';

  installPhase = ''
    runHook preInstall
    mkdir -p "$out"
    cp -r "$TMPDIR/public/." "$out/"
    cp scripts/websrv "$out/websrv"
    substituteInPlace "$out/websrv" --replace-fail '@PYTHON@' '${pkgs.python3}/bin/python3'
    chmod +x "$out/websrv"
    runHook postInstall
  '';

  meta = {
    description = "Visualización pública de la deuda española";
    homepage = "https://deudapublica.es";
    license = pkgs.lib.licenses.mit;
    platforms = pkgs.lib.platforms.all;
  };
}
