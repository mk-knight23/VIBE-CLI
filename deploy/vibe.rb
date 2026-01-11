class Vibe < Formula
  desc "VIBE CLI - AI Developer Teammate. One command, infinite capability."
  homepage "https://github.com/mk-knight23/VIBE-CLI"
  url "https://github.com/mk-knight23/VIBE-CLI/archive/refs/tags/v13.0.0.tar.gz"
  sha256 "REPLACE_WITH_ACTUAL_SHA256"
  license "MIT"

  depends_on "node"

  def install
    system "npm", "install", *Language::Node.std_npm_install_args(libexec)
    bin.install_symlink Dir["#{libexec}/bin/*"]
  end

  test do
    system "#{bin}/vibe", "--version"
  end
end
