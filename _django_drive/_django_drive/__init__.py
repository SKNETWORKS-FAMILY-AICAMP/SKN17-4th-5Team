import platform

# Mac 환경에서만 PyMySQL을 MySQLdb로 대체
if platform.system() == "Darwin":
    import pymysql
    pymysql.install_as_MySQLdb()
