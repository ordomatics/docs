# The shell shown on camera: a short prompt and no variables from the recording
# machine's own profile (they would override the project's .env in compose).
for v in $(compgen -v | grep -E '^(DB_|ODOO_|ADMIN_PASSWD|PLATFORM_TAG|COMPOSE_PROJECT_NAME)'); do unset "$v"; done
export PATH="$HOME/.local/bin:/usr/local/bin:/usr/bin:/bin:/snap/bin"
export GIT_PAGER=cat PAGER=cat
PS1='\[\e[1;32m\]\W\[\e[0m\] $ '
clear
