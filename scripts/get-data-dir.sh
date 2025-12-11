#!/bin/bash

# get-data-dir.sh
# Returns the OS-specific application data directory for Arkadian
#
# macOS:   ~/Library/Application Support/Arkadian
# Linux:   ~/.arkadian
# Windows: $LOCALAPPDATA/Arkadian (or $APPDATA/Arkadian)
#
# Based on the btcd appDataDir pattern

APP_NAME="Arkadian"
APP_NAME_LOWER="arkadian"

get_data_dir() {
    local home_dir=""

    # Get home directory
    if [ -n "$HOME" ]; then
        home_dir="$HOME"
    else
        # Fallback: try to get from user info
        home_dir=$(eval echo ~)
    fi

    # Determine OS and return appropriate path
    case "$(uname -s)" in
        Darwin)
            # macOS: ~/Library/Application Support/Arkadian
            if [ -n "$home_dir" ]; then
                echo "${home_dir}/Library/Application Support/${APP_NAME}"
                return 0
            fi
            ;;

        Linux|FreeBSD|OpenBSD|NetBSD)
            # Linux/BSD: ~/.arkadian
            if [ -n "$home_dir" ]; then
                echo "${home_dir}/.${APP_NAME_LOWER}"
                return 0
            fi
            ;;

        CYGWIN*|MINGW*|MSYS*)
            # Windows (via Git Bash, Cygwin, etc.)
            # Prefer LOCALAPPDATA, fall back to APPDATA
            if [ -n "$LOCALAPPDATA" ]; then
                echo "${LOCALAPPDATA}/${APP_NAME}"
                return 0
            elif [ -n "$APPDATA" ]; then
                echo "${APPDATA}/${APP_NAME}"
                return 0
            elif [ -n "$home_dir" ]; then
                # Fallback to home directory
                echo "${home_dir}/.${APP_NAME_LOWER}"
                return 0
            fi
            ;;

        *)
            # Unknown OS: use hidden directory in home
            if [ -n "$home_dir" ]; then
                echo "${home_dir}/.${APP_NAME_LOWER}"
                return 0
            fi
            ;;
    esac

    # Last resort: current directory
    echo "."
    return 1
}

# If script is run directly (not sourced), print the directory
if [ "${BASH_SOURCE[0]}" == "${0}" ]; then
    get_data_dir
fi
