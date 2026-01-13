#!/usr/bin/env zsh
#
# VIBE CLI Zsh Autocomplete
# Installation:
#   Place this file in a directory in your $fpath, e.g.:
#     mkdir -p ~/.zsh/completion
#     cp vibe-completion.zsh ~/.zsh/completion/
#   Then add to ~/.zshrc:
#     autoload -U compinit
#     compinit
#

_vibe_commands() {
    echo "help status scaffold debug fix test docs viz mood undo config interactive init analyze review explain search generate refactor plan checkpoint restore session doctor version update telemetry"
}

_vibe_options() {
    echo "--help --version --verbose --debug --dry-run --force --yes --no --profile --output --format --theme --model --safe --offline"
}

_vibe_scaffold_types() {
    echo "react nextjs vue nuxt express fastify nestjs go rust python django flask api cli library component"
}

_vibe_mood_options() {
    echo "--json --verbose --compact --emoji --no-emoji"
}

_vibe_config_options() {
    echo "get set list reset export import profile"
}

_vibe_doctor_options() {
    echo "--verbose --fix --json"
}

_vibe_viz_types() {
    echo "tree graph architecture dependency treemap"
}

_vibe_viz_options() {
    echo "--type --depth --json --output"
}

_vibe_search_options() {
    echo "--type --regex --context --json --verbose"
}

_vibe_debug_options() {
    echo "--analyze --trace --json --verbose --fix"
}

_vibe() {
    local -a commands options

    commands=(${(s: :)_vibe_commands})
    options=(${(s: :)_vibe_options})

    local -a scaffold_types mood_options config_options
    scaffold_types=(${(s: :)_vibe_scaffold_types})
    mood_options=(${(s: :)_vibe_mood_options})
    config_options=(${(s: :)_vibe_config_options})

    local curcontext="$curcontext"
    local line
    (( $+line[1] )) && {
        local -a words
        words=(${(z)line[1]})
        (( $+words[1] )) && {
            local command="${words[1]}"
            case "$command" in
                scaffold)
                    _describe -t commands 'scaffold types' scaffold_types
                    ;;
                mood)
                    _describe -t options 'mood options' mood_options
                    ;;
                config)
                    _describe -t commands 'config commands' config_options
                    ;;
                *)
                    _describe -t commands 'commands' commands
                    _describe -t options 'options' options
                    ;;
            esac
        }
    } || {
        _describe -t commands 'commands' commands
        _describe -t options 'options' options
    }

    _comps[$compstate[insert]]=
}

compdef _vibe vibe
