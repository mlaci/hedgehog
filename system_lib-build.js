// build emscripten system libraries

const { spawnSync } = require('child_process')
const path = require('path');

const { StringDecoder } = require('string_decoder');
const decoder = new StringDecoder('utf8');

const tmp = "/tmp/emscripten"
const dest = "/emscripten/system"

function build(libname, filenames, src, ext, args, outputname=path.format({name:libname, ext:'.bc'})){
  const libtmp = path.join(tmp, libname)
  spawnSync("mkdir", ['-p', libtmp])
  command = ext == ".c" && "clang" || "clang++"
  filenames = filenames.split(" ")
  filenames.forEach(file => {
    const dir = path.parse(file).dir;
    if(dir != ''){
      spawnSync("mkdir", ['-p', path.join(libtmp, dir)]);
    }
    var ret = spawnSync(command, [path.format({dir:src, name:file, ext:ext}), '-o', path.format({dir:libtmp, name:file, ext:ext+'.o'})].concat(args.split(' ')))
    var log = decoder.write(ret.stderr)
    if(log && log != ''){
      console.log(log)
    }
  })
  filenames = filenames.map(name=>path.format({name:name, ext:ext+'.o'}))
  if(path.extname(outputname)==".bc"){
    spawnSync("llvm-link", filenames.concat(['-o',path.join(dest,outputname)]), {cwd:libtmp})
  }
  else{
    spawnSync("llvm-ar", ['cr', '-format=gnu', path.join(dest,outputname)].concat(filenames), {cwd:libtmp})
  }
}

spawnSync("mkdir", ['-p', tmp]);

var additionalArgs = "--target=wasm32-unknown-unknown -D__EMSCRIPTEN_major__=1 -D__EMSCRIPTEN_minor__=37 -D__EMSCRIPTEN_tiny__=19 -D_LIBCPP_ABI_VERSION=2 -D__EMSCRIPTEN__ -Dunix -D__unix -D__unix__ -Werror=implicit-function-declaration -nostdinc -Xclang -nobuiltininc -Xclang -nostdsysteminc -Xclang -isystem/emscripten/system/include/libcxx -Xclang -isystem/emscripten/system/lib/libcxxabi/include -Xclang -isystem/emscripten/system/include/compat -Xclang -isystem/emscripten/system/include -Xclang -isystem/emscripten/system/include/SSE -Xclang -isystem/emscripten/system/include/libc -Xclang -isystem/emscripten/system/lib/libc/musl/arch/emscripten -Xclang -isystem/emscripten/system/local/include -fno-inline-functions -Xclang -isystem/emscripten/emscripten/1.37.19/system/include/SDL -emit-llvm -c"

var libcxxFiles = "algorithm any bind chrono condition_variable debug exception future hash ios iostream locale memory mutex new optional random regex shared_mutex stdexcept string strstream system_error thread typeinfo utility valarray variant"
var libcxxArgs = "-std=c++11 -Werror -DLIBCXX_BUILDING_LIBCXXABI=1 -D_LIBCPP_BUILDING_LIBRARY -Oz -I/emscripten/system/lib/libcxxabi/include -fno-exceptions"
build("libcxx", libcxxFiles, "/emscripten/system/lib/libcxx", ".cpp", additionalArgs+' '+libcxxArgs, "libcxx_noexcept.bc");

var libcxxabiFiles = "abort_message cxa_aux_runtime cxa_default_handlers cxa_demangle cxa_exception_storage cxa_guard cxa_new_delete cxa_handlers exception stdexcept typeinfo private_typeinfo"
var libcxxabiArgs = "-std=c++11 -Werror -Oz -I/emscripten/system/lib/libcxxabi/include"
build("libcxxabi", libcxxabiFiles, "/emscripten/system/lib/libcxxabi/src", ".cpp", additionalArgs+' '+libcxxabiArgs);

var libcFiles = "fenv/feupdateenv fenv/fegetexceptflag fenv/fesetround fenv/__flt_rounds fenv/fenv fenv/feholdexcept fenv/fesetexceptflag multibyte/c32rtomb multibyte/mbsinit multibyte/wctomb multibyte/mbtowc multibyte/mbrtoc32 multibyte/wcstombs multibyte/wcsrtombs multibyte/internal multibyte/mblen multibyte/btowc multibyte/mbrlen multibyte/mbstowcs multibyte/wcrtomb multibyte/mbrtoc16 multibyte/wctob multibyte/mbrtowc multibyte/mbsnrtowcs multibyte/wcsnrtombs multibyte/c16rtomb multibyte/mbsrtowcs stat/lchmod stat/mknod stat/mkfifo stat/fstat stat/mkdirat stat/mkfifoat stat/utimensat stat/futimens stat/lstat stat/fchmodat stat/mkdir stat/chmod stat/statvfs stat/futimesat stat/mknodat stat/stat stat/umask stat/__xstat stat/fchmod stat/fstatat crypt/crypt_sha256 crypt/crypt_md5 crypt/crypt_sha512 crypt/crypt crypt/crypt_des crypt/crypt_blowfish crypt/encrypt crypt/crypt_r temp/mkostemps temp/mkstemp temp/mkstemps temp/mktemp temp/mkdtemp temp/mkostemp temp/__randname ctype/iswcntrl ctype/isascii ctype/wctrans ctype/iswalpha ctype/iswxdigit ctype/__ctype_b_loc ctype/iswdigit ctype/isgraph ctype/toupper ctype/iswalnum ctype/iswgraph ctype/isprint ctype/isxdigit ctype/iswlower ctype/toascii ctype/wcswidth ctype/iswupper ctype/wcwidth ctype/towctrans ctype/iswpunct ctype/__ctype_toupper_loc ctype/isalpha ctype/iswctype ctype/__ctype_tolower_loc ctype/isdigit ctype/iscntrl ctype/ispunct ctype/iswprint ctype/iswblank ctype/isupper ctype/isblank ctype/isalnum ctype/islower ctype/tolower ctype/__ctype_get_mb_cur_max ctype/isspace ctype/iswspace internal/libc internal/syscall_ret internal/shgetc internal/procfdname internal/version internal/intscan internal/vdso internal/floatscan mman/mprotect mman/mincore mman/mlockall mman/madvise mman/munmap mman/munlockall mman/munlock mman/msync mman/posix_madvise mman/shm_open mman/mmap mman/mremap mman/mlock locale/newlocale locale/iconv locale/wcscoll locale/towctrans_l locale/uselocale locale/catgets locale/duplocale locale/textdomain locale/isalpha_l locale/wctype_l locale/iswalnum_l locale/isspace_l locale/locale_map locale/isupper_l locale/iswxdigit_l locale/iswprint_l locale/iscntrl_l locale/islower_l locale/isalnum_l locale/iswpunct_l locale/tolower_l locale/iswlower_l locale/wcsxfrm locale/isdigit_l locale/strfmon locale/catclose locale/strcoll locale/iswalpha_l locale/strcasecmp_l locale/wctrans_l locale/bind_textdomain_codeset locale/iswdigit_l locale/iswgraph_l locale/towlower_l locale/strxfrm locale/setlocale locale/catopen locale/isgraph_l locale/ispunct_l locale/freelocale locale/isprint_l locale/strerror_l locale/isxdigit_l locale/iswupper_l locale/iswblank_l locale/pleval locale/towupper_l locale/__lctrans locale/__mo_lookup locale/strncasecmp_l locale/iswcntrl_l locale/dcngettext locale/c_locale locale/toupper_l locale/iswctype_l locale/localeconv locale/isblank_l locale/iswspace_l locale/langinfo misc/login_tty misc/getsubopt misc/wordexp misc/lockf misc/issetugid misc/getdomainname misc/nftw misc/ioctl misc/getrlimit misc/ffsl misc/getresuid misc/getrusage misc/forkpty misc/getopt misc/ffs misc/a64l misc/basename misc/syslog misc/realpath misc/emscripten_pthread misc/mntent misc/getgrouplist misc/dirname misc/getpriority misc/setdomainname misc/getresgid misc/fmtmsg misc/ffsll misc/getauxval misc/pty misc/setpriority misc/getopt_long misc/gethostid misc/get_current_dir_name misc/uname misc/initgroups misc/openpty misc/ptsname misc/setrlimit dirent/fdopendir dirent/versionsort dirent/rewinddir dirent/readdir_r dirent/dirfd dirent/alphasort dirent/seekdir dirent/closedir dirent/readdir dirent/__getdents dirent/telldir dirent/scandir dirent/opendir fcntl/fcntl fcntl/posix_fadvise fcntl/openat fcntl/posix_fallocate fcntl/creat fcntl/open prng/seed48 prng/rand prng/lrand48 prng/lcong48 prng/random prng/__seed48 prng/rand_r prng/__rand48_step prng/srand48 prng/mrand48 prng/drand48 termios/cfgetospeed termios/tcsendbreak termios/tcgetsid termios/tcsetattr termios/cfsetospeed termios/tcflush termios/tcdrain termios/cfmakeraw termios/tcgetattr termios/tcflow errno/__errno_location errno/strerror stdlib/gcvt stdlib/strtod stdlib/fcvt stdlib/bsearch stdlib/wcstol stdlib/div stdlib/llabs stdlib/atof stdlib/imaxabs stdlib/wcstod stdlib/atoll stdlib/ldiv stdlib/qsort stdlib/atoi stdlib/strtol stdlib/atol stdlib/labs stdlib/ecvt stdlib/lldiv stdlib/imaxdiv string/memmem string/swab string/wmemcpy string/wcsdup string/stpncpy string/bcmp string/wcslen string/strndup string/bzero string/strverscmp string/strcasecmp string/rindex string/wcsspn string/strcat string/wcscat string/wcscasecmp string/strrchr string/strstr string/wcswcs string/strcmp string/strcspn string/strlen string/wmemmove string/stpcpy string/wcsncmp string/wcscspn string/bcopy string/wcpncpy string/strnlen string/memcmp string/strchrnul string/strsep string/wcscmp string/wcsncasecmp string/memccpy string/wcsnlen string/wmemset string/strlcpy string/strspn string/wcspbrk string/strpbrk string/strsignal string/strncat string/strlcat string/strncmp string/wmemcmp string/wcpcpy string/wcsstr string/strncasecmp string/wmemchr string/strchr string/wcstok string/wcsncat string/strtok_r string/wcscasecmp_l string/strdup string/strncpy string/strcpy string/index string/memrchr string/mempcpy string/strerror_r string/wcschr string/wcsncasecmp_l string/wcsrchr string/strtok string/wcsncpy string/memchr string/strcasestr string/wcscpy unistd/seteuid unistd/getuid unistd/dup unistd/setresgid unistd/readlinkat unistd/pwritev unistd/write unistd/writev unistd/ualarm unistd/getlogin unistd/symlinkat unistd/fchown unistd/isatty unistd/readv unistd/setreuid unistd/unlinkat unistd/renameat unistd/setpgid unistd/fchdir unistd/getlogin_r unistd/setpgrp unistd/chdir unistd/sleep unistd/pread unistd/getsid unistd/linkat unistd/setxid unistd/chown unistd/pipe2 unistd/readlink unistd/fdatasync unistd/ftruncate unistd/unlink unistd/close unistd/ttyname_r unistd/pause unistd/pipe unistd/link unistd/truncate unistd/tcgetpgrp unistd/faccessat unistd/gethostname unistd/rmdir unistd/access unistd/getpgrp unistd/getegid unistd/setgid unistd/symlink unistd/posix_close unistd/getgid unistd/sync unistd/tcsetpgrp unistd/ctermid unistd/preadv unistd/setegid unistd/getgroups unistd/getpgid unistd/lchown unistd/nice unistd/getcwd unistd/dup3 unistd/setresuid unistd/setsid unistd/fsync unistd/read unistd/ttyname unistd/lseek unistd/fchownat unistd/geteuid unistd/getpid unistd/pwrite unistd/dup2 unistd/setuid unistd/setregid unistd/acct unistd/getppid regex/tre-mem regex/fnmatch regex/glob regex/regerror regex/regcomp regex/regexec select/poll select/select select/pselect compat-emscripten/strupr compat-emscripten/strtol_l compat-emscripten/__synccall compat-emscripten/strlwr network/getservbyname_r network/shutdown network/socketpair network/if_nametoindex network/ent network/if_indextoname network/dn_expand network/ntohs network/lookup_ipliteral network/if_freenameindex network/getservbyname network/ns_parse network/in6addr_any network/inet_aton network/recv network/getsockopt network/getpeername network/h_errno network/res_state network/sendmmsg network/accept4 network/res_msend network/dns_parse network/getservbyport_r network/getifaddrs network/res_init network/sendmsg network/if_nameindex network/__ipparse network/recvfrom network/lookup_name network/netlink network/socket network/res_querydomain network/dn_skipname network/setsockopt network/serv network/herror network/recvmmsg network/ether network/send network/htons network/recvmsg network/freeaddrinfo network/inet_ntoa network/accept network/lookup_serv network/htonl network/in6addr_loopback network/resolvconf network/getsockname network/dn_comp network/inet_ntop network/__dns network/netname network/res_send network/getservbyport network/sockatmark network/connect network/inet_pton network/hstrerror network/sendto network/res_mkquery network/bind network/listen network/inet_legacy network/ntohl complex/casin complex/csqrt complex/ctanhl complex/cexpl complex/cacos complex/catanf complex/ctan complex/ctanhf complex/cabsf complex/catanh complex/csinf complex/catanhl complex/cimagf complex/casinf complex/conjf complex/ctanf complex/clogf complex/casinl complex/ctanh complex/cpow complex/ccos complex/casinhl complex/ccosf complex/ccosl complex/cabsl complex/ccoshl complex/cimag complex/clogl complex/csqrtf complex/cpowf complex/conj complex/cacoshl complex/cargf complex/casinhf complex/catanhf complex/creal complex/csinl complex/carg complex/conjl complex/cprojf complex/cabs complex/ccosh complex/crealf complex/cexpf complex/cargl complex/csinh complex/ccoshf complex/creall complex/csinhl complex/__cexp complex/cpowl complex/cprojl complex/ctanl complex/clog complex/cproj complex/cacoshf complex/catan complex/csqrtl complex/cimagl complex/cacosf complex/cacosh complex/cexp complex/casinh complex/__cexpf complex/csinhf complex/csin complex/catanl complex/cacosl " +
                "stdio/getline stdio/swprintf stdio/fopen stdio/tmpfile stdio/rename stdio/vscanf stdio/fgetc stdio/tmpnam stdio/freopen stdio/fprintf stdio/putc_unlocked stdio/funlockfile stdio/vfscanf stdio/ungetwc stdio/__stdio_exit stdio/vsprintf stdio/printf stdio/scanf stdio/fwscanf stdio/getc_unlocked stdio/ftrylockfile stdio/stdout stdio/asprintf stdio/getchar stdio/snprintf stdio/popen stdio/sscanf stdio/__fmodeflags stdio/remove stdio/vprintf stdio/vsscanf stdio/fgetln stdio/fputc stdio/putwchar stdio/fclose stdio/__overflow stdio/__stdio_close stdio/__stdout_write stdio/perror stdio/open_wmemstream stdio/fgetpos stdio/fwprintf stdio/__uflow stdio/vfwscanf stdio/puts stdio/getdelim stdio/setvbuf stdio/fwrite stdio/putwc stdio/fscanf stdio/fputs stdio/vwscanf stdio/vdprintf stdio/fseek stdio/vsnprintf stdio/__stdio_write stdio/__towrite stdio/getw stdio/fmemopen stdio/fread stdio/vasprintf stdio/putc stdio/swscanf stdio/fsetpos stdio/feof stdio/getc stdio/fwide stdio/vfwprintf stdio/fgets stdio/__lockfile stdio/ftell stdio/getwchar stdio/__fopen_rb_ca stdio/wscanf stdio/stderr stdio/sprintf stdio/ferror stdio/ofl stdio/setbuf stdio/tempnam stdio/__string_read stdio/__toread stdio/setlinebuf stdio/__stdio_seek stdio/setbuffer stdio/putw stdio/vwprintf stdio/fileno stdio/__fclose_ca stdio/fflush stdio/ext2 stdio/wprintf stdio/pclose stdio/getchar_unlocked stdio/clearerr stdio/ofl_add stdio/fgetwc stdio/open_memstream stdio/vswprintf stdio/fputwc stdio/vswscanf stdio/putchar_unlocked stdio/__fdopen stdio/rewind stdio/dprintf stdio/fgetws stdio/ungetc stdio/getwc stdio/stdin stdio/vfprintf stdio/flockfile stdio/ext stdio/fputws stdio/__stdio_read stdio/putchar stdio/gets math/lgammaf_r math/llroundl math/__tanl math/erf math/__signbitf math/sincos math/j0 math/nexttoward math/__signbit math/exp2l math/signgam math/fdim math/atanh math/remainderl math/logbf math/jnf math/nexttowardf math/scalbnl math/nextafterl math/cbrt math/remquof math/finitef math/fmin math/exp2 math/asinhf math/modf math/lroundl math/nextafterf math/expm1f math/log10l math/nan math/nearbyint math/__sindf math/nearbyintl math/truncf math/scalbnf math/tgammaf math/logbl math/log1pf math/hypotf math/frexpf math/nexttowardl math/__fpclassify math/scalblnl math/__signbitl math/__sinl math/atanhf math/__rem_pio2_large math/sincosl math/log1pl math/fma math/fmodf math/__polevll math/sinhl math/sinhf math/log1p math/ilogbf math/__rem_pio2f math/__expo2f math/ilogb math/log2 math/tanhl math/nanl math/log2l math/acosh math/tanhf math/llrintl math/hypotl math/remainderf math/fmaxl math/modfl math/sincosf math/copysign math/asinh math/lgamma_r math/cbrtf math/ilogbl math/erfl math/nanf math/fmal math/lroundf math/copysignl math/lrintl math/scalb math/erff math/exp10 math/__tan math/finite math/j1 math/__expo2 math/lrint math/__cosl math/__sin math/coshf math/remquo math/llrintf math/ldexpl math/tgamma math/llround math/lgamma math/fmaf math/trunc math/__tandf math/asinhl math/remainder math/jn math/j0f math/nextafter math/fminf math/significandf math/exp10l math/ldexp math/__rem_pio2l math/__cos math/ldexpf math/llroundf math/truncl math/sinh math/llrint math/rintl math/lround math/fdiml math/tanh math/nearbyintf math/modff math/__invtrigl math/__fpclassifyf math/lrintf math/hypot math/scalblnf math/__fpclassifyl math/coshl math/scalbn math/rint math/lgammaf math/frexp math/fminl math/exp10f math/log2f math/log10 math/fmax math/expm1l math/lgammal math/tgammal math/roundl math/exp2f math/scalbln math/cbrtl math/fmod math/logb math/j1f math/atanhl math/__cosdf math/remquol math/frexpl math/copysignf math/__rem_pio2 math/acoshl math/rintf math/fdimf math/fmodl math/fmaxf math/cosh math/expm1 math/acoshf math/significand math/scalbf math/log10f"
var libcArgs = "-I /emscripten/system/lib/libc/musl/src/internal -I /emscripten/system/lib/libc/musl/arch/js -Werror -Wno-return-type -Wno-parentheses -Wno-ignored-attributes -Wno-shift-count-overflow -Wno-shift-negative-value -Wno-dangling-else -Wno-unknown-pragmas -Wno-shift-op-parentheses -Wno-string-plus-int -Wno-logical-op-parentheses -Wno-bitwise-op-parentheses -Wno-visibility -Wno-pointer-sign -Wno-error=absolute-value -Os"
build("libc", libcFiles, "/emscripten/system/lib/libc/musl/src", ".c", additionalArgs+' '+libcArgs);

var wasmlibcFiles = "cos cosf cosl sin sinf sinl tan tanf tanl acos acosf acosl asin asinf asinl atan atanf atanl atan2 atan2f atan2l exp expf expl log logf logl pow powf powl"
var wasmlibcArgs = "-I /emscripten/system/lib/libc/musl/src/internal -I /emscripten/system/lib/libc/musl/arch/js -Werror -Wno-return-type -Wno-parentheses -Wno-ignored-attributes -Wno-shift-count-overflow -Wno-shift-negative-value -Wno-dangling-else -Wno-unknown-pragmas -Wno-shift-op-parentheses -Wno-string-plus-int -Wno-logical-op-parentheses -Wno-bitwise-op-parentheses -Wno-visibility -Wno-pointer-sign -Wno-error=absolute-value -O2"
build("wasm-libc", wasmlibcFiles, "/emscripten/system/lib/libc/musl/src/math", ".c", additionalArgs+' '+wasmlibcArgs);

var wasmlibcrtFiles = "math/fmin math/fminf math/fminl math/fmax math/fmaxf math/fmaxl math/fmod math/fmodf math/fmodl string/memcpy string/memset string/memmove"
var wasmlibcrtArgs = "--target=wasm32 -mthread-model single -S -O2 -I /emscripten/system/lib/libc/musl/src/internal -I /emscripten/system/lib/libc/musl/arch/js -nostdinc -Xclang -nobuiltininc -Xclang -nostdsysteminc -Xclang -isystem/emscripten/system/include/libcxx -Xclang -isystem/emscripten/system/lib/libcxxabi/include -Xclang -isystem/emscripten/system/include/compat -Xclang -isystem/emscripten/system/include -Xclang -isystem/emscripten/system/include/SSE -Xclang -isystem/emscripten/system/include/libc -Xclang -isystem/emscripten/system/lib/libc/musl/arch/emscripten -Xclang -isystem/emscripten/system/local/include"
build("wasm_libc_rt", wasmlibcrtFiles, "/emscripten/system/lib/libc/musl/src", ".c", wasmlibcrtArgs, "wasm_libc_rt.a");

var wasmcompilerrtFiles = "addtf3 ashlti3 ashrti3 atomic comparetf2 divtf3 divti3 udivmodti4 extenddftf2 extendsftf2 fixdfti fixsfti fixtfdi fixtfsi fixtfti fixunsdfti fixunssfti fixunstfdi fixunstfsi fixunstfti floatditf floatsitf floattidf floattisf floatunditf floatunsitf floatuntidf floatuntisf lshrti3 modti3 multf3 multi3 subtf3 udivti3 umodti3 ashrdi3 ashldi3 fixdfdi floatdidf lshrdi3 moddi3 trunctfdf2 trunctfsf2 umoddi3 fixunsdfdi muldi3 divdi3 divmoddi4 udivdi3 udivmoddi4"
var wasmcompilerrtArgs = "--target=wasm32 -mthread-model single -S -O2 -I /emscripten/system/lib/libc/musl/src/internal -I /emscripten/system/lib/libc/musl/arch/js -nostdinc -Xclang -nobuiltininc -Xclang -nostdsysteminc -Xclang -isystem/emscripten/system/include/libcxx -Xclang -isystem/emscripten/system/lib/libcxxabi/include -Xclang -isystem/emscripten/system/include/compat -Xclang -isystem/emscripten/system/include -Xclang -isystem/emscripten/system/include/SSE -Xclang -isystem/emscripten/system/include/libc -Xclang -isystem/emscripten/system/lib/libc/musl/arch/emscripten -Xclang -isystem/emscripten/system/local/include"
build("wasm_compiler_rt", wasmcompilerrtFiles, "/emscripten/system/lib/compiler-rt/lib/builtins", ".c", wasmcompilerrtArgs, "wasm_compiler_rt.a");

function build_dlmalloc(){
  var ret = spawnSync("clang", ["/emscripten/system/lib/dlmalloc.c", '-o', path.join(dest,"dlmalloc.bc"), "-O2"].concat(additionalArgs.split(' ')))
  var log = decoder.write(ret.stderr)
  if(log && log != ''){
    console.log(log)
  }
}
build_dlmalloc()

spawnSync("rm", ['-rf', tmp]);