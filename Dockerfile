FROM ubuntu

SHELL ["/bin/bash", "-c"]

# install build tools
RUN apt-get update -y && \
    apt-get install -y cmake ninja-build clang curl python xz-utils

ENV CC clang
ENV CXX clang++
ENV LLVM_VERSION 5.0.0
# build llvm with WebAssembly target
RUN mkdir -p /llvm && \
    curl -L http://releases.llvm.org/${LLVM_VERSION}/llvm-${LLVM_VERSION}.src.tar.xz | \
        tar xJ -f /dev/stdin -C /llvm --strip-components=1 && \
    mkdir -p /llvm/tools/clang && \
    curl -L http://releases.llvm.org/${LLVM_VERSION}/cfe-${LLVM_VERSION}.src.tar.xz | \
        tar xJ -f /dev/stdin -C /llvm/tools/clang --strip-components=1 && \
    mkdir -p /llvm/build && \
    cd /llvm/build && \
    cmake -G Ninja -DCMAKE_BUILD_TYPE=Release -DLLVM_TARGETS_TO_BUILD= -DLLVM_EXPERIMENTAL_TARGETS_TO_BUILD=WebAssembly .. && \
    ninja && \
    ninja install && \
    rm -rf /llvm

ENV BINARYEN_VERSION 1.37.20
# download binaryen tools
RUN curl -L https://github.com/WebAssembly/binaryen/releases/download/${BINARYEN_VERSION}/binaryen-${BINARYEN_VERSION}-x86-linux.tar.gz | \
        tar zx -f /dev/stdin -C /usr/local/bin --strip-components=1 binaryen-${BINARYEN_VERSION}/s2wasm binaryen-${BINARYEN_VERSION}/wasm-as

ENV EMSCRIPTEN_VERSION 1.37.19
# download emscripten system files
RUN mkdir -p /emscripten && \
    curl -L https://github.com/kripken/emscripten/archive/${EMSCRIPTEN_VERSION}.tar.gz | \
        tar zx -f /dev/stdin -C /emscripten --strip-components=1 emscripten-${EMSCRIPTEN_VERSION}/system

# download freeglut freeglut_ext header
RUN curl https://sourceforge.net/p/freeglut/code/HEAD/tree/tags/FG_3_0_0/include/GL/freeglut.h?format=raw -o /emscripten/system/include/GL/freeglut.h && \
    curl https://sourceforge.net/p/freeglut/code/HEAD/tree/tags/FG_3_0_0/include/GL/freeglut_ext.h?format=raw -o /emscripten/system/include/GL/freeglut_ext.h

# install node 8
RUN curl -L https://deb.nodesource.com/setup_8.x | bash - && \
    apt-get install -y nodejs

# compile system libraries
ADD system_lib-build.js /emscripten/
RUN nodejs /emscripten/system_lib-build.js

# clean up
RUN apt-get remove --purge -y cmake ninja-build subversion curl python xz-utils && \
    apt-get autoremove -y && \
    rm -rf /var/lib/apt/lists/*

ADD .clang-format /

##

COPY app /app/

WORKDIR /app

RUN npm --unsafe-perm install

ENV NODE_ENV production

EXPOSE 8080

CMD ["npm", "start"]
