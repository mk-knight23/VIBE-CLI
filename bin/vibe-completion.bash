#!/bin/bash
#
# VIBE CLI Shell Autocomplete
# Installation:
#   Bash: echo "source $(pwd)/vibe-completion.bash" >> ~/.bashrc && source ~/.bashrc
#   Zsh: echo "source $(pwd)/vibe-completion.zsh" >> ~/.zshrc && source ~/.zshrc
#

_vibe_commands() {
    cat <<EOF
help
status
scaffold
debug
fix
test
docs
viz
mood
undo
config
interactive
init
analyze
review
explain
search
generate
refactor
plan
checkpoint
restore
session
doctor
version
update
telemetry
EOF
}

_vibe_options() {
    cat <<EOF
--help
--version
--verbose
--debug
--dry-run
--force
--yes
--no
--profile
--output
--format
--theme
--model
--safe
--offline
EOF
}

_vibe_scaffold_types() {
    cat <<EOF
react
nextjs
vue
nuxt
express
fastify
nestjs
go
rust
python
django
flask
api
cli
library
component
EOF
}

_vibe_mood_options() {
    cat <<EOF
--json
--verbose
--compact
--emoji
--no-emoji
EOF
}

_vibe_config_options() {
    cat <<EOF
get
set
list
reset
export
import
profile
EOF
}

_vibe_doctor_options() {
    cat <<EOF
--verbose
--fix
--json
EOF
}

_vibe_viz_options() {
    cat <<EOF
--type
--depth
--json
--output
EOF
}

_vibe_viz_types() {
    cat <<EOF
tree
graph
architecture
dependency
treemap
EOF
}

_vibe_search_options() {
    cat <<EOF
--type
--regex
--context
--json
--verbose
EOF
}

_vibe_debug_options() {
    cat <<EOF
--analyze
--trace
--json
--verbose
--fix
EOF
}

_vibe() {
    local cur prev words cword
    _init_completion || return

    local command=""
    local subcommand=""
    local options_only=0

    # Find the command
    for ((i=1; i<${#words[@]}; i++)); do
        local w="${words[i]}"
        if [[ "$w" == -* ]]; then
            continue
        elif [[ -z "$command" ]]; then
            command="$w"
        elif [[ -z "$subcommand" ]]; then
            subcommand="$w"
        fi
    done

    # Complete options anywhere
    if [[ "$cur" == -* ]]; then
        COMPREPLY=($(compgen -W "$(_vibe_options)" -- "$cur"))
        return
    fi

    # Command-specific completion
    case "$command" in
        scaffold)
            if [[ -z "$subcommand" ]] || [[ "$prev" == "$subcommand" ]]; then
                COMPREPLY=($(compgen -W "$(_vibe_scaffold_types)" -- "$cur"))
            fi
            ;;
        mood)
            COMPREPLY=($(compgen -W "$(_vibe_mood_options)" -- "$cur"))
            ;;
        config)
            if [[ -z "$subcommand" ]]; then
                COMPREPLY=($(compgen -W "$(_vibe_config_options)" -- "$cur"))
            fi
            ;;
        doctor)
            COMPREPLY=($(compgen -W "$(_vibe_doctor_options)" -- "$cur"))
            ;;
        viz)
            if [[ -z "$subcommand" ]]; then
                COMPREPLY=($(compgen -W "$(_vibe_viz_types)" -- "$cur"))
            else
                COMPREPLY=($(compgen -W "$(_vibe_viz_options)" -- "$cur"))
            fi
            ;;
        search)
            COMPREPLY=($(compgen -W "$(_vibe_search_options)" -- "$cur"))
            ;;
        debug)
            COMPREPLY=($(compgen -W "$(_vibe_debug_options)" -- "$cur"))
            ;;
        *)
            # Default: complete with commands
            COMPREPLY=($(compgen -W "$(_vibe_commands)" -- "$cur"))
            ;;
    esac

    # Add trailing space for unique matches
    compopt -o nospace
}

# For older bash versions
_completion_loader() {
    local cmd="$1"
    local completion_file=""
    local -a dirs=(
        ${BASH_COMPLETION_COMPAT_DIR:-/etc/bash_completion.d}
        ${XDG_DATA_HOME:-$HOME/.local/share}/bash-completion/completions
        ${HOME}/.bash-completion/completions
        /usr/local/share/bash-completion/completions
        /usr/share/bash-completion/completions
    )
    for dir in "${dirs[@]}"; do
        if [[ -f "$dir/$cmd" ]]; then
            completion_file="$dir/$cmd"
            break
        fi
    done
    [[ -n "$completion_file" ]] && . "$completion_file"
}

# Initialize completion
complete -F _vibe vibe 2>/dev/null || true
