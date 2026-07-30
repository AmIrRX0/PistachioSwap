#!/usr/bin/env sh
set -eu

repo_url="https://github.com/parsij/Pchained.git"
pinned_commit="0d9cf6682b329b2b14a8959400a25720a77247e0"
target_dir=".unchained/Pchained"

if [ -e "$target_dir/.git" ]; then
  git -C "$target_dir" fetch origin main
else
  mkdir -p ".unchained"
  git clone "$repo_url" "$target_dir"
fi

git -C "$target_dir" checkout "$pinned_commit"

printf '%s\n' "Pchained prepared at $target_dir"
printf '%s\n' "Repository: $repo_url"
printf '%s\n' "Pinned commit: $pinned_commit"
