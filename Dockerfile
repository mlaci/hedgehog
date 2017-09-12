FROM ubuntu

SHELL ["/bin/bash", "-c"]

# build tools
RUN  apt-get update -y  && \
     apt-get install -y git \
                        cmake \
                        ninja-build \
                        gcc-4.8 \
                        g++-4.8 \
                        subversion \
                        curl \
                        python

ENV CC gcc-4.8
ENV CXX g++-4.8

# build llvm clang with WebAssembly target
RUN mkdir -p /build && cd /build && \
    svn export http://llvm.org/svn/llvm-project/llvm/trunk llvm && \
    mkdir -p /build/llvm/tools && cd /build/llvm/tools && \
    svn export http://llvm.org/svn/llvm-project/cfe/trunk clang && \
    mkdir -p /build/llvm/build && cd /build/llvm/build && \
    cmake -G Ninja -DCMAKE_BUILD_TYPE=Release -DLLVM_TARGETS_TO_BUILD= -DLLVM_EXPERIMENTAL_TARGETS_TO_BUILD=WebAssembly .. && \
    ninja && \
    ninja install && \
    rm -rf /build

# build binaryen tools  
RUN cd / && \
    git clone https://github.com/WebAssembly/binaryen.git && \
    cd /binaryen && \
    cmake -G Ninja . && ninja && \
    cp /binaryen/bin/s2wasm /binaryen/bin/wasm-as /usr/local/bin && \
    rm -rf /binaryen

# download emscripten system files
RUN mkdir /emscripten && cd /emscripten && \
    curl -L https://github.com/kripken/emscripten/archive/1.37.19.tar.gz -o emscripten-1.37.19.tar.gz && \
    tar zxvf emscripten-1.37.19.tar.gz emscripten-1.37.19/system && \
    rm emscripten-1.37.19.tar.gz && \
    mv emscripten-1.37.19/system system && rmdir emscripten-1.37.19 && \
    curl https://sourceforge.net/p/freeglut/code/HEAD/tree/tags/FG_3_0_0/include/GL/freeglut.h?format=raw -o /emscripten/system/include/GL/freeglut.h && \
    curl https://sourceforge.net/p/freeglut/code/HEAD/tree/tags/FG_3_0_0/include/GL/freeglut_ext.h?format=raw -o /emscripten/system/include/GL/freeglut_ext.h

# install node 8
RUN curl -L https://deb.nodesource.com/setup_8.x | bash - && \
    apt-get install -y nodejs

# compile system libraries
ADD system_lib-build.js /emscripten/
RUN nodejs /emscripten/system_lib-build.js && \

# clean up
RUN apt-get remove --purge -y git cmake ninja-build gcc-4.8 g++-4.8 subversion curl python && \
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