
import subprocess
import sys
import os

def main():
    """
    INOVAR GESTÃO - MASTER RUNNER
    Starts Backend, Frontend, and Services automatically.
    """
    print("🚀 Iniciando sistema Inovar Gestão...")

    # Path to the actual dev runner logic
    script_path = os.path.join("infra", "scripts", "dev_runner.py")

    if not os.path.exists(script_path):
        print(f"❌ Erro: Script de inicialização não encontrado em {script_path}")
        return

    try:
        # Execute the dev runner
        subprocess.run([sys.executable, script_path], check=True)
    except KeyboardInterrupt:
        print("\n👋 Sistema encerrado pelo usuário.")
    except Exception as e:
        print(f"❌ Erro ao iniciar o sistema: {e}")

if __name__ == "__main__":
    main()
